import * as Comlink from "comlink";
import type { TFile } from "obsidian";
import PQueue from "p-queue";
import {
  GRANULARITIES,
  inferNoteIdentityFromFile,
} from "src/db/note-file-identity";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import ScanWorkerFactory from "src/db/scan.worker?worker&inline";
import type { ScannableNote, ScanWorkerAPI } from "src/db/worker-api";
import type { Settings } from "src/settings";
import type { Topic } from "src/core/topic";
import { DEFAULT_TOPIC } from "src/core/topic";
import { getAllTopicNotes } from "src/lib/daily-notes";
import { getDateFromFile } from "src/lib/daily-notes/utils";
import { MFDIDatabase } from "src/db/mfdi-db";
import { ScanWorkerPool } from "src/db/scan-worker-pool";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_QUEUE_CONCURRENCY = 8;
const DEFAULT_SCAN_CHUNK_SIZE = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanTarget {
  file: TFile;
  path: string;
  noteName: string;
  topicId: string;
  noteDate: string;
  noteGranularity: (typeof GRANULARITIES)[number];
}

export interface TagIndexerOptions {
  api?: ScanWorkerAPI | Comlink.Remote<ScanWorkerAPI>;
  queueConcurrency?: number;
  scanChunkSize?: number;
  workerFactory?: () => Worker;
}

// ---------------------------------------------------------------------------
// Scan executor abstraction
// Centralises the "direct API vs worker pool" branching in one place,
// so the rest of TagIndexer never has to think about it.
// ---------------------------------------------------------------------------

class DirectApiExecutor implements ScanWorkerAPI {
  constructor(private readonly api: ScanWorkerAPI | Comlink.Remote<ScanWorkerAPI>) {}

  scanFiles(files: ScannableNote[], meta?: { batchId?: string }) {
    return (this.api as any).scanFiles(files, meta);
  }

  scanFile(note: ScannableNote, meta?: { batchId?: string }) {
    return (this.api as any).scanFile(note, meta);
  }

  async dispose() {
    // nothing to tear down
  }
}

class WorkerPoolExecutor implements ScanWorkerAPI {
  constructor(private readonly pool: ScanWorkerPool) {}

  scanFiles(files: ScannableNote[], meta?: { batchId?: string }) {
    const { remote } = this.pool.next();
    return (remote as any).scanFiles(files, meta);
  }

  scanFile(note: ScannableNote, meta?: { batchId?: string }) {
    const { remote } = this.pool.next();
    return (remote as any).scanFile(note, meta);
  }

  async dispose() {
    await this.pool.dispose();
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function normalizeTopics(topics: Topic[]): Topic[] {
  const map = new Map<string, Topic>([[DEFAULT_TOPIC.id, DEFAULT_TOPIC]]);
  for (const topic of topics) {
    map.set(topic.id, topic);
  }
  return [...map.values()];
}

function isSameTarget(a: ScanTarget, b: ScanTarget): boolean {
  return (
    a.path === b.path &&
    a.topicId === b.topicId &&
    a.noteGranularity === b.noteGranularity &&
    a.noteDate === b.noteDate
  );
}

function collectScanTargets(
  shell: ObsidianAppShell,
  settings: Settings,
): ScanTarget[] {
  const uniqueTargets = new Map<string, ScanTarget>();
  const ambiguousPaths = new Set<string>();

  for (const topic of normalizeTopics(settings.topics)) {
    for (const granularity of GRANULARITIES) {
      const notes = getAllTopicNotes(shell, granularity, topic.id);

      for (const file of Object.values(notes)) {
        if (ambiguousPaths.has(file.path)) continue;

        const noteDate =
          getDateFromFile(file, granularity, shell, topic.id)?.toISOString() ?? "";
        if (!noteDate) continue;

        const candidate: ScanTarget = {
          file,
          path: file.path,
          noteName: file.basename,
          topicId: topic.id,
          noteGranularity: granularity,
          noteDate,
        };

        const existing = uniqueTargets.get(file.path);
        if (!existing) {
          uniqueTargets.set(file.path, candidate);
          continue;
        }

        if (!isSameTarget(existing, candidate)) {
          uniqueTargets.delete(file.path);
          ambiguousPaths.add(file.path);
        }
      }
    }
  }

  return [...uniqueTargets.values()];
}

async function toScannableNote(
  shell: ObsidianAppShell,
  target: ScanTarget,
): Promise<ScannableNote> {
  const content = await shell.cachedReadFile(target.file);
  return {
    path: target.path,
    noteName: target.noteName,
    topicId: target.topicId,
    noteGranularity: target.noteGranularity,
    noteDate: target.noteDate,
    content,
  };
}

// ---------------------------------------------------------------------------
// TagIndexer
// ---------------------------------------------------------------------------

export class TagIndexer {
  private readonly executor: ScanWorkerAPI;
  private readonly queueConcurrency: number;
  private readonly scanChunkSize: number;
  private readonly db: MFDIDatabase;
  private readonly initializePromise: Promise<void>;

  constructor(appId: string, options: TagIndexerOptions = {}) {
    this.queueConcurrency = options.queueConcurrency ?? DEFAULT_QUEUE_CONCURRENCY;
    this.scanChunkSize = options.scanChunkSize ?? DEFAULT_SCAN_CHUNK_SIZE;
    this.db = new MFDIDatabase(appId);

    if (options.api) {
      this.executor = new DirectApiExecutor(options.api);
    } else {
      const hw =
        navigator.hardwareConcurrency
          ? navigator.hardwareConcurrency
          : 4;
      const poolSize = Math.max(1, Math.floor(hw * 0.75));
      const factory = options.workerFactory ?? (() => new ScanWorkerFactory());
      this.executor = new WorkerPoolExecutor(new ScanWorkerPool(poolSize, factory));
    }

    this.initializePromise = this.db.open().then();
  }

  private waitUntilReady(): Promise<void> {
    return this.initializePromise;
  }

  // -------------------------------------------------------------------------
  // Full scan
  // -------------------------------------------------------------------------

  async scanAllNotes(shell: ObsidianAppShell, settings: Settings): Promise<void> {
    await this.waitUntilReady();

    const t0 = performance.now();
    const targets = collectScanTargets(shell, settings);
    const readQueue = new PQueue({ concurrency: this.queueConcurrency });
    const writeQueue = new PQueue({ concurrency: 1 });


    await this.db.transaction("rw", this.db.memos, this.db.meta, this.db.tagStats, async () => {
      await this.db.memos.clear();
      await this.db.meta.clear();
      await this.db.tagStats.clear();
    });

    for (let start = 0; start < targets.length; start += this.scanChunkSize) {
      const batch = targets.slice(start, start + this.scanChunkSize);
      const notes = await Promise.all(
        batch.map((t) => readQueue.add(() => toScannableNote(shell, t))),
      );
      // Kick off parsing immediately, buffer writes to stay sequential on DB.
      const batchId = (typeof crypto !== "undefined" && (crypto as any).randomUUID)
        ? (crypto as any).randomUUID()
        : `${start}-${Date.now()}`;

      let bytes = 0;
      try {
        const enc = new TextEncoder();
        bytes = notes.reduce((s, n) => s + enc.encode(n.content).length, 0);
      } catch {
        bytes = notes.reduce((s, n) => s + n.content.length, 0);
      }

      const tSend = performance.now();
      const parsePromise = this.executor.scanFiles(notes, { batchId });

      writeQueue.add(async () => {
        const result = await parsePromise;
        const records = result?.records ?? [];
        const workerTimings = result?.timings;
        const tRecv = performance.now();

        // Log batch-level metrics and persist a small perf record to meta.
        const perf = {
          batchId,
          noteCount: notes.length,
          bytes,
          hostSendMs: tSend,
          hostRecvMs: tRecv,
          hostRoundtripMs: tRecv - tSend,
          workerTimings,
        };
        try {
          await this.db.memos.bulkPut(records);
        } finally {
          try {
            await this.db.meta.put({ key: `perf:batch:${batchId}`, value: JSON.stringify(perf) });
          } catch (e) {
            // ignore meta write failure
          }
          console.log("mfdi:batch-perf", perf);
        }
      });
    }

    await readQueue.onIdle();
    await writeQueue.onIdle();
    await this.rebuildTagStats();
    await this.db.meta.put({ key: "lastFullScanAt", value: new Date().toISOString() });
      console.log(`transfer: ${performance.now() - t0}ms, count: ${targets.length}`);

    window.dispatchEvent(new CustomEvent("mfdi-db-updated"));
  }

  // -------------------------------------------------------------------------
  // Incremental updates
  // -------------------------------------------------------------------------

  async onFileChanged(
    shell: ObsidianAppShell,
    file: TFile,
    settings: Settings,
  ): Promise<void> {
    await this.waitUntilReady();

    const identity = inferNoteIdentityFromFile(
      file,
      normalizeTopics(settings.topics),
      shell,
    );
    if (!identity) return;

    const content = await shell.cachedReadFile(file);
    const batchId = (typeof crypto !== "undefined" && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : `file-${Date.now()}`;

    const result = await this.executor.scanFile({
      path: file.path,
      noteName: file.basename,
      topicId: identity.topicId,
      noteGranularity: identity.granularity,
      noteDate: identity.noteDate.toISOString(),
      content,
    }, { batchId });

    const records = result?.records ?? [];

    await this.db.transaction("rw", this.db.memos, this.db.tagStats, async () => {
      await this.db.memos.where("path").equals(file.path).delete();
      if (records?.length) {
        await this.db.memos.bulkPut(records);
      }
      await this.rebuildTagStats();
    });

    window.dispatchEvent(new CustomEvent("mfdi-db-updated", { detail: { path: file.path } }));
  }

  async onFileDeleted(path: string): Promise<void> {
    await this.waitUntilReady();

    await this.db.transaction("rw", this.db.memos, this.db.tagStats, async () => {
      await this.db.memos.where("path").equals(path).delete();
      await this.rebuildTagStats();
    });

    window.dispatchEvent(new CustomEvent("mfdi-db-updated", { detail: { path } }));
  }

  async onFileRenamed(
    shell: ObsidianAppShell,
    file: TFile,
    oldPath: string,
    settings: Settings,
  ): Promise<void> {
    await this.waitUntilReady();

    await this.db.transaction("rw", this.db.memos, this.db.tagStats, async () => {
      await this.db.memos.where("path").equals(oldPath).delete();
      await this.rebuildTagStats();
    });

    await this.onFileChanged(shell, file, settings);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async dispose(): Promise<void> {
    await this.waitUntilReady();
    this.db.close();
    await this.executor.dispose();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async rebuildTagStats(): Promise<void> {
    const counts = new Map<string, number>();

    for (const memo of await this.db.memos.toArray()) {
      if (memo.archived || memo.deleted) continue;
      for (const tag of memo.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    const updatedAt = new Date().toISOString();
    await this.db.tagStats.clear();
    if (counts.size > 0) {
      await this.db.tagStats.bulkPut(
        [...counts.entries()].map(([tag, count]) => ({ tag, count, updatedAt })),
      );
    }
  }
}
