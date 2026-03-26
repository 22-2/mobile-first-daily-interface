import * as Comlink from "comlink";
import { buildMemoRecordsForNote } from "src/db/scan-note";
import type { ScanWorkerAPI } from "src/db/worker-api";

const workerApi: ScanWorkerAPI = {
  async initialize(_args) {
    // Worker has no DB responsibility anymore. No-op.
    return;
  },

  async resetIndex() {
    // No DB in worker; nothing to reset here.
    return;
  },

  async scanFiles(files) {
    // Parse notes into MemoRecord[] and return to main thread for DB writes.
    return files.flatMap(buildMemoRecordsForNote);
  },

  async scanFile(file) {
    return buildMemoRecordsForNote(file);
  },

  async removeFile(_path) {
    // DB removal happens in main thread now.
    return;
  },

  async rebuildTagStats() {
    // Main thread will rebuild tag stats.
    return;
  },

  async setMeta(_key, _value) {
    // Main thread handles meta writes.
    return;
  },

  async dispose() {
    return;
  },
};

Comlink.expose(workerApi);
