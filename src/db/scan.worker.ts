import * as Comlink from "comlink";
import { buildMemoRecordsForNote } from "src/db/scan-note";
import type { ScanWorkerAPI, ScanResultEnvelope } from "src/db/worker-api";

function estimateBytes(files: { content: string }[]): number {
  try {
    const enc = new TextEncoder();
    return files.reduce((s, f) => s + enc.encode(f.content).length, 0);
  } catch {
    return files.reduce((s, f) => s + f.content.length, 0);
  }
}

const workerApi: ScanWorkerAPI = {
  async scanFiles(files, meta) {
    const started = performance.now();
    const bytes = estimateBytes(files as any);
    const records = files.flatMap(buildMemoRecordsForNote);
    const finished = performance.now();

    // Post a timing message to the host so main thread can observe worker timings.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (self as any).postMessage?.({
        type: "mfdi-worker-timing",
        batchId: meta?.batchId,
        started,
        finished,
        noteCount: files.length,
        bytes,
      });
    } catch (e) {
      // ignore
    }

    const envelope: ScanResultEnvelope = { records, timings: { started, finished, noteCount: files.length, bytes } };
    return envelope;
  },

  async scanFile(file, meta) {
    const started = performance.now();
    const bytes = estimateBytes([file as any]);
    const records = buildMemoRecordsForNote(file);
    const finished = performance.now();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (self as any).postMessage?.({
        type: "mfdi-worker-timing",
        batchId: meta?.batchId,
        started,
        finished,
        noteCount: 1,
        bytes,
      });
    } catch (e) {
      // ignore
    }

    const envelope: ScanResultEnvelope = { records, timings: { started, finished, noteCount: records.length, bytes } };
    return envelope;
  },
  async dispose() {
    return;
  },
};

Comlink.expose(workerApi);
