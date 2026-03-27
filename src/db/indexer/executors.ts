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
// Scan executor abstraction
// Centralises the "direct API vs worker pool" branching in one place,
// so the rest of TagIndexer never has to think about it.
// ---------------------------------------------------------------------------

export class DirectApiExecutor implements ScanWorkerAPI {
  constructor(private readonly api: ScanWorkerAPI | Comlink.Remote<ScanWorkerAPI>) {}

  scanFiles(files: ScannableNote[], meta?: { batchId?: string }) {
    return this.api.scanFiles(files, meta);
  }

  scanFile(note: ScannableNote, meta?: { batchId?: string }) {
    return this.api.scanFile(note, meta);
  }

  async dispose() {
    // nothing to tear down
  }
}

export class WorkerPoolExecutor implements ScanWorkerAPI {
  constructor(private readonly pool: ScanWorkerPool) {}

  scanFiles(files: ScannableNote[], meta?: { batchId?: string }) {
    const { remote } = this.pool.next();
    return remote.scanFiles(files, meta);
  }

  scanFile(note: ScannableNote, meta?: { batchId?: string }) {
    const { remote } = this.pool.next();
    return remote.scanFile(note, meta);
  }

  async dispose() {
    await this.pool.dispose();
  }
}
