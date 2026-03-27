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
import { DirectApiExecutor, WorkerPoolExecutor } from "./executors";
import { DEFAULT_QUEUE_CONCURRENCY, DEFAULT_SCAN_CHUNK_SIZE } from "./types";
import { collectScanTargets, toScannableNote, normalizeTopics } from "./utils";

export interface TagIndexerOptions {
  api?: ScanWorkerAPI | Comlink.Remote<ScanWorkerAPI>;
  queueConcurrency?: number;
  scanChunkSize?: number;
  workerFactory?: () => Worker;
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
      const removedTagCounts = await this.collectTagCountsForPath(file.path);

      // Replace memos for this path.
      await this.db.memos.where("path").equals(file.path).delete();
      if (records?.length) {
        await this.db.memos.bulkPut(records);
      }

      // Compute added tags from new records.
      const addedTagCounts = this.collectTagCountsFromRecords(records);

      await this.applyTagDeltas(removedTagCounts, addedTagCounts);
    });

    window.dispatchEvent(new CustomEvent("mfdi-db-updated", { detail: { path: file.path } }));
  }

  async onFileDeleted(path: string): Promise<void> {
    await this.waitUntilReady();

    await this.db.transaction("rw", this.db.memos, this.db.tagStats, async () => {
      const removedTagCounts = await this.collectTagCountsForPath(path);
      await this.db.memos.where("path").equals(path).delete();
      await this.applyTagDeltas(removedTagCounts, new Map());
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

    // For rename, delete old path memos (collecting their tags), then
    // let onFileChanged insert the new records and apply deltas.
    // Note: this first transaction deletes memos at the old path and
    // applies tag removals. If the process crashes after this transaction
    // and before `onFileChanged` completes, `tagStats` may temporarily be
    // missing the counts for the renamed file until `onFileChanged` finishes.
    // Making the rename fully atomic would require performing the new-file
    // scan+insert inside the same transaction; we avoid that here because
    // `onFileChanged` performs side-effects (events) and scanning.
    await this.db.transaction("rw", this.db.memos, this.db.tagStats, async () => {
      const removedTagCounts = await this.collectTagCountsForPath(oldPath);
      await this.db.memos.where("path").equals(oldPath).delete();
      await this.applyTagDeltas(removedTagCounts, new Map());
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
  private async applyTagDeltas(
    removed: Map<string, number>,
    added: Map<string, number>,
  ): Promise<void> {
    const tags = [...new Set([...removed.keys(), ...added.keys()])];
    if (tags.length === 0) return;

    // Fetch existing rows in a single call.
    const existingRows = await this.db.tagStats.bulkGet(tags as any);
    const updatedAt = new Date().toISOString();

    const toPut: { tag: string; count: number; updatedAt: string }[] = [];
    const toDelete: string[] = [];

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const existingCount = existingRows[i]?.count ?? 0;
      const newCount = existingCount - (removed.get(tag) ?? 0) + (added.get(tag) ?? 0);

      if (newCount > 0) {
        toPut.push({ tag, count: newCount, updatedAt });
      } else {
        if (existingCount > 0) toDelete.push(tag);
      }
    }

    const ops: Promise<unknown>[] = [];
    if (toPut.length) ops.push(this.db.tagStats.bulkPut(toPut));
    if (toDelete.length) ops.push(this.db.tagStats.bulkDelete(toDelete));

    await Promise.all(ops);
  }

  private async collectTagCountsForPath(path: string): Promise<Map<string, number>> {
    const memos = await this.db.memos.where("path").equals(path).toArray();
    const counts = new Map<string, number>();
    for (const m of memos) {
      if (m.archived || m.deleted) continue;
      for (const t of m.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return counts;
  }

  private collectTagCountsFromRecords(records: any[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const r of records ?? []) {
      if (r.archived || r.deleted) continue;
      for (const t of r.tags ?? []) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return counts;
  }
}
