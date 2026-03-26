import * as Comlink from "comlink";
import type { TFile } from "obsidian";
import PQueue from "p-queue";
import {
  GRANULARITIES,
  inferNoteIdentityFromFile,
} from "src/db/note-file-identity";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
// @ts-expect-error esbuild-plugin-inline-worker rewrites this module to a Worker factory at build time.
import ScanWorkerFactory from "src/db/scan.worker";
import type { ScannableNote, ScanWorkerAPI } from "src/db/worker-api";
import type { Settings } from "src/settings";
import type { Topic } from "src/core/topic";
import { DEFAULT_TOPIC } from "src/core/topic";
import { getAllTopicNotes } from "src/lib/daily-notes";
import { getDateFromFile } from "src/lib/daily-notes/utils";
import { MFDIDatabase } from "src/db/mfdi-db";
import { ScanWorkerPool } from "src/db/scan-worker-pool";

const DEFAULT_QUEUE_CONCURRENCY = 8;
const DEFAULT_SCAN_CHUNK_SIZE = 100;

interface ScanTarget {
  file: TFile;
  path: string;
  noteName: string;
  topicId: string;
  noteDate: string;
  noteGranularity: (typeof GRANULARITIES)[number];
}

interface TagIndexerOptions {
  api?: ScanWorkerAPI | Comlink.Remote<ScanWorkerAPI>;
  queueConcurrency?: number;
  scanChunkSize?: number;
  workerFactory?: () => Worker;
}

function normalizeTopics(topics: Topic[]): Topic[] {
  const map = new Map<string, Topic>();
  map.set(DEFAULT_TOPIC.id, DEFAULT_TOPIC);

  for (const topic of topics) {
    map.set(topic.id, topic);
  }

  return [...map.values()];
}

function isSameTarget(left: ScanTarget, right: ScanTarget): boolean {
  return (
    left.path === right.path &&
    left.topicId === right.topicId &&
    left.noteGranularity === right.noteGranularity &&
    left.noteDate === right.noteDate
  );
}

function collectScanTargets(
  shell: ObsidianAppShell,
  settings: Settings,
): ScanTarget[] {
  const uniqueTargets = new Map<string, ScanTarget>();
  const ambiguousPaths = new Set<string>();
  const topics = normalizeTopics(settings.topics);

  for (const topic of topics) {
    for (const granularity of GRANULARITIES) {
      const notes = getAllTopicNotes(shell, granularity, topic.id);

      for (const file of Object.values(notes)) {
        if (ambiguousPaths.has(file.path)) {
          continue;
        }

        const nextTarget: ScanTarget = {
          file,
          path: file.path,
          noteName: file.basename,
          topicId: topic.id,
          noteGranularity: granularity,
          noteDate:
            getDateFromFile(
              file,
              granularity,
              shell,
              topic.id,
            )?.toISOString() ?? "",
        };

        if (!nextTarget.noteDate) {
          continue;
        }

        const existing = uniqueTargets.get(file.path);
        if (!existing) {
          uniqueTargets.set(file.path, nextTarget);
          continue;
        }

        if (!isSameTarget(existing, nextTarget)) {
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

export class TagIndexer {
  private readonly api: ScanWorkerAPI | Comlink.Remote<ScanWorkerAPI>;
  private readonly queueConcurrency: number;
  private readonly scanChunkSize: number;
  private readonly worker?: Worker;
  private readonly db: MFDIDatabase;
  private readonly workerPool?: ScanWorkerPool;
  private readonly useDirectApi: boolean;
  private readonly initializePromise: Promise<void>;

  constructor(appId: string, options: TagIndexerOptions = {}) {
    this.queueConcurrency =
      options.queueConcurrency ?? DEFAULT_QUEUE_CONCURRENCY;
    this.scanChunkSize = options.scanChunkSize ?? DEFAULT_SCAN_CHUNK_SIZE;
    this.db = new MFDIDatabase(appId);

    if (options.api) {
      this.api = options.api;
      this.useDirectApi = true;
      this.workerPool = undefined;
    } else {
      this.useDirectApi = false;
      const hw =
        typeof navigator !== "undefined" &&
        (navigator as any).hardwareConcurrency
          ? (navigator as any).hardwareConcurrency
          : 4;
      const poolSize = Math.max(1, Math.floor(hw * 0.75));
      const factory = options.workerFactory ?? (() => new ScanWorkerFactory());
      this.workerPool = new ScanWorkerPool(poolSize, factory);
    }

    this.initializePromise = (async () => {
      await this.db.open();
    })();
  }

  private async waitUntilReady() {
    await this.initializePromise;
  }

  async scanAllNotes(
    shell: ObsidianAppShell,
    settings: Settings,
  ): Promise<void> {
    await this.waitUntilReady();

    const targets = collectScanTargets(shell, settings);
    const queue = new PQueue({ concurrency: this.queueConcurrency });

    // Reset index (clear DB) — worker no longer manages DB lifecycle.
    await this.db.transaction(
      "rw",
      this.db.memos,
      this.db.meta,
      this.db.tagStats,
      async () => {
        await this.db.memos.clear();
        await this.db.meta.clear();
        await this.db.tagStats.clear();
      },
    );

    const writeQueue = new PQueue({ concurrency: 1 });

    for (let start = 0; start < targets.length; start += this.scanChunkSize) {
      const batchTargets = targets.slice(start, start + this.scanChunkSize);
      const files = await Promise.all(
        batchTargets.map((target) =>
          queue.add(() => toScannableNote(shell, target)),
        ),
      );

      if (this.useDirectApi) {
        const records = await this.api.scanFiles(files);
        if (records && records.length > 0) {
          await this.db.memos.bulkPut(records);
        }
      } else {
        const workerRemote = this.workerPool!.next();
        const parsePromise = workerRemote.scanFiles(files);
        writeQueue.add(async () => {
          const records = await parsePromise;
          if (records && records.length > 0) {
            await this.db.memos.bulkPut(records);
          }
        });
      }
    }

    await queue.onIdle();
    await writeQueue.onIdle();
    await this.rebuildTagStats();
    await this.db.meta.put({
      key: "lastFullScanAt",
      value: new Date().toISOString(),
    });
    window.dispatchEvent(new CustomEvent("mfdi-db-updated"));
  }

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
    if (!identity) {
      return;
    }

    const content = await shell.cachedReadFile(file);
    const records = await this.api.scanFile({
      path: file.path,
      noteName: file.basename,
      topicId: identity.topicId,
      noteGranularity: identity.granularity,
      noteDate: identity.noteDate.toISOString(),
      content,
    });

    await this.db.transaction(
      "rw",
      this.db.memos,
      this.db.tagStats,
      async () => {
        await this.db.memos.where("path").equals(file.path).delete();
        if (records && records.length > 0) {
          await this.db.memos.bulkPut(records);
        }
        await this.rebuildTagStats();
      },
    );

    window.dispatchEvent(
      new CustomEvent("mfdi-db-updated", { detail: { path: file.path } }),
    );
  }

  async onFileDeleted(path: string): Promise<void> {
    await this.waitUntilReady();
    await this.db.transaction(
      "rw",
      this.db.memos,
      this.db.tagStats,
      async () => {
        await this.db.memos.where("path").equals(path).delete();
        await this.rebuildTagStats();
      },
    );
    // Worker API no longer handles removals; DB change already applied above.
    window.dispatchEvent(
      new CustomEvent("mfdi-db-updated", { detail: { path } }),
    );
  }

  async onFileRenamed(
    shell: ObsidianAppShell,
    file: TFile,
    oldPath: string,
    settings: Settings,
  ): Promise<void> {
    await this.waitUntilReady();
    await this.db.transaction(
      "rw",
      this.db.memos,
      this.db.tagStats,
      async () => {
        await this.db.memos.where("path").equals(oldPath).delete();
        await this.rebuildTagStats();
      },
    );
    await this.onFileChanged(shell, file, settings);
  }

  async dispose(): Promise<void> {
    await this.waitUntilReady();
    this.db.close();
    if (this.workerPool) {
      await this.workerPool.dispose();
    }
    this.worker?.terminate();
  }

  private async rebuildTagStats(): Promise<void> {
    const memos = await this.db.memos.toArray();
    const counts = new Map<string, number>();

    for (const memo of memos) {
      if (memo.archived || memo.deleted) {
        continue;
      }

      for (const tag of memo.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    const updatedAt = new Date().toISOString();
    await this.db.tagStats.clear();
    if (counts.size === 0) {
      return;
    }

    await this.db.tagStats.bulkPut(
      [...counts.entries()].map(([tag, count]) => ({ tag, count, updatedAt })),
    );
  }
}

export type { TagIndexerOptions };
