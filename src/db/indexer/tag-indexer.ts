import type { TFile } from "obsidian";
import PQueue from "p-queue";
import {
  DEFAULT_QUEUE_CONCURRENCY,
  DEFAULT_SCAN_CHUNK_SIZE,
} from "src/db/indexer/types";
import {
  collectScanTargets,
  normalizeTopics,
  toScannableNote,
} from "src/db/indexer/utils";
import { inferNoteIdentityFromFile } from "src/db/note-file-identity";
import { WorkerClient } from "src/db/worker-client";
import type { Settings } from "src/settings";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TagIndexerOptions {
  queueConcurrency?: number;
  scanChunkSize?: number;
}

// ---------------------------------------------------------------------------
// TagIndexer
// ---------------------------------------------------------------------------

export class TagIndexer {
  private readonly queueConcurrency: number;
  private readonly scanChunkSize: number;

  constructor(_appId: string, options: TagIndexerOptions = {}) {
    this.queueConcurrency =
      options.queueConcurrency ?? DEFAULT_QUEUE_CONCURRENCY;
    this.scanChunkSize = options.scanChunkSize ?? DEFAULT_SCAN_CHUNK_SIZE;
  }

  // -------------------------------------------------------------------------
  // Full scan
  // -------------------------------------------------------------------------

  async scanAllNotes(
    shell: ObsidianAppShell,
    settings: Settings,
  ): Promise<void> {
    const targets = collectScanTargets(shell, settings);
    const readQueue = new PQueue({ concurrency: this.queueConcurrency });

    const scannableNotes = await Promise.all(
      targets.map((t) => readQueue.add(() => toScannableNote(shell, t))),
    );

    const validNotes = scannableNotes.filter(
      (n): n is NonNullable<typeof n> => n !== null,
    );

    const dbService = WorkerClient.get();
    await dbService.scanAllNotes(validNotes);
  }

  // -------------------------------------------------------------------------
  // Incremental updates
  // -------------------------------------------------------------------------

  async onFileChanged(
    shell: ObsidianAppShell,
    file: TFile,
    settings: Settings,
  ): Promise<void> {
    const identity = inferNoteIdentityFromFile(
      file,
      normalizeTopics(settings.topics),
      shell,
    );
    if (!identity) return;

    const content = await shell.cachedReadFile(file);

    const dbService = WorkerClient.get();
    await dbService.onFileChanged({
      path: file.path,
      noteName: file.basename,
      topicId: identity.topicId,
      noteGranularity: identity.granularity,
      noteDate: identity.noteDate.toISOString(),
      content,
    });
  }

  async onFileDeleted(path: string): Promise<void> {
    const dbService = WorkerClient.get();
    await dbService.onFileDeleted(path);
  }

  async onFileRenamed(
    shell: ObsidianAppShell,
    file: TFile,
    oldPath: string,
    settings: Settings,
  ): Promise<void> {
    const identity = inferNoteIdentityFromFile(
      file,
      normalizeTopics(settings.topics),
      shell,
    );
    if (!identity) return;

    const content = await shell.cachedReadFile(file);
    const dbService = WorkerClient.get();
    await dbService.onFileRenamed(
      {
        path: file.path,
        noteName: file.basename,
        topicId: identity.topicId,
        noteGranularity: identity.granularity,
        noteDate: identity.noteDate.toISOString(),
        content,
      },
      oldPath,
    );
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async dispose(): Promise<void> {
    // WorkerClient is a singleton, so we don't necessarily want to dispose it here
    // unless the entire app is shutting down.
  }
}
