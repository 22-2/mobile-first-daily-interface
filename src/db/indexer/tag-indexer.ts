import * as Comlink from "comlink";
import type { TFile } from "obsidian";
import PQueue from "p-queue";
import { inferNoteIdentityFromFile } from "src/db/note-file-identity";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import ScanWorkerFactory from "src/db/scan.worker?worker&inline";
import type { ScannableNote, ScanWorkerAPI } from "src/db/worker-api";
import type { Settings } from "src/settings";
import { MFDIDatabase } from "src/db/mfdi-db";
import { ScanWorkerPool } from "src/db/scan-worker-pool";
import { DirectApiExecutor, WorkerPoolExecutor } from "./executors";
import { DEFAULT_QUEUE_CONCURRENCY, DEFAULT_SCAN_CHUNK_SIZE } from "./types";
import { collectScanTargets, toScannableNote, normalizeTopics, buildWorkerPool, estimateBytes, generateBatchId } from "./utils";
import { TagStatsManager } from "./tag-stats-manager";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

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
  private readonly tagStats: TagStatsManager;
  private readonly ready: Promise<void>;

  constructor(appId: string, options: TagIndexerOptions = {}) {
    this.queueConcurrency = options.queueConcurrency ?? DEFAULT_QUEUE_CONCURRENCY;
    this.scanChunkSize = options.scanChunkSize ?? DEFAULT_SCAN_CHUNK_SIZE;
    this.db = new MFDIDatabase(appId);
    this.tagStats = new TagStatsManager(this.db);
    this.executor = options.api
      ? new DirectApiExecutor(options.api)
      : buildWorkerPool(options.workerFactory);
    this.ready = this.db.open().then();
  }

  // -------------------------------------------------------------------------
  // Full scan
  // -------------------------------------------------------------------------

  async scanAllNotes(shell: ObsidianAppShell, settings: Settings): Promise<void> {
    await this.ready;

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
      // Kick off parsing immediately; buffer DB writes to stay sequential.
      writeQueue.add(() => this.processBatch(notes));
    }

    await readQueue.onIdle();
    await writeQueue.onIdle();
    await this.tagStats.rebuild();
    await this.db.meta.put({ key: "lastFullScanAt", value: new Date().toISOString() });
    console.log(`mfdi:full-scan elapsed=${performance.now() - t0}ms count=${targets.length}`);

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
    await this.ready;

    const identity = inferNoteIdentityFromFile(
      file,
      normalizeTopics(settings.topics),
      shell,
    );
    if (!identity) return;

    const content = await shell.cachedReadFile(file);
    const batchId = generateBatchId();

    const result = await this.executor.scanFile(
      {
        path: file.path,
        noteName: file.basename,
        topicId: identity.topicId,
        noteGranularity: identity.granularity,
        noteDate: identity.noteDate.toISOString(),
        content,
      },
      { batchId },
    );

    const records = result?.records ?? [];

    await this.db.transaction("rw", this.db.memos, this.db.tagStats, async () => {
      const removed = await this.tagStats.collectForPath(file.path);

      await this.db.memos.where("path").equals(file.path).delete();
      if (records.length) await this.db.memos.bulkPut(records);

      const added = this.tagStats.collectFromRecords(records);
      await this.tagStats.applyDeltas(removed, added);
    });

    window.dispatchEvent(new CustomEvent("mfdi-db-updated", { detail: { path: file.path } }));
  }

  async onFileDeleted(path: string): Promise<void> {
    await this.ready;

    await this.db.transaction("rw", this.db.memos, this.db.tagStats, async () => {
      const removed = await this.tagStats.collectForPath(path);
      await this.db.memos.where("path").equals(path).delete();
      await this.tagStats.applyDeltas(removed, new Map());
    });

    window.dispatchEvent(new CustomEvent("mfdi-db-updated", { detail: { path } }));
  }

  async onFileRenamed(
    shell: ObsidianAppShell,
    file: TFile,
    oldPath: string,
    settings: Settings,
  ): Promise<void> {
    await this.ready;

    // Delete old-path memos first, then delegate to onFileChanged for the new path.
    // Note: if the process crashes between these two steps, tagStats will be
    // temporarily under-counted until the next onFileChanged or full scan.
    await this.db.transaction("rw", this.db.memos, this.db.tagStats, async () => {
      const removed = await this.tagStats.collectForPath(oldPath);
      await this.db.memos.where("path").equals(oldPath).delete();
      await this.tagStats.applyDeltas(removed, new Map());
    });

    await this.onFileChanged(shell, file, settings);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async dispose(): Promise<void> {
    await this.ready;
    this.db.close();
    await this.executor.dispose();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async processBatch(notes: ScannableNote[]): Promise<void> {
    const batchId = generateBatchId();
    const bytes = estimateBytes(notes);
    const tSend = performance.now();

    const result = await this.executor.scanFiles(notes, { batchId });
    const records = result?.records ?? [];
    const tRecv = performance.now();

    const perf = {
      batchId,
      noteCount: notes.length,
      bytes,
      hostRoundtripMs: tRecv - tSend,
      workerTimings: result?.timings,
    };

    try {
      await this.db.memos.bulkPut(records);
    } finally {
      this.db.meta
        .put({ key: `perf:batch:${batchId}`, value: JSON.stringify(perf) })
        .catch(() => {/* ignore meta write failures */});
      console.log("mfdi:batch-perf", perf);
    }
  }
}
