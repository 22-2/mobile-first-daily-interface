import * as Comlink from "comlink";
import { buildMemoRecordsForNote } from "src/db/scan-note";
import type { ScanWorkerAPI } from "src/db/worker-api";

const workerApi: ScanWorkerAPI = {
  async scanFiles(files) {
    // Parse notes into MemoRecord[] and return to main thread for DB writes.
    return files.flatMap(buildMemoRecordsForNote);
  },

  async scanFile(file) {
    return buildMemoRecordsForNote(file);
  },
  async dispose() {
    return;
  },
};

Comlink.expose(workerApi);
