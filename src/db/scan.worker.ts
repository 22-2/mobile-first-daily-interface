// src/db/scan.worker.ts
import * as Comlink from "comlink";
import { DexieDBService } from "src/db/impl/DexieDBService";
import type { IDBService } from "src/db/interfaces/IDBService";
import type { ScannableNote } from "src/db/worker-api";

const TAG = "[scan.worker]";

function estimateNotesBytes(notes?: ScannableNote[]): number {
  if (!notes || notes.length === 0) return 0;
  try {
    const enc = new TextEncoder();
    return notes.reduce((sum, n) => sum + (n.content ? enc.encode(n.content).length : 0), 0);
  } catch {
    return notes.reduce((sum, n) => sum + (n.content ? n.content.length : 0), 0);
  }
}

console.log(TAG, "Worker loading...");

// add global handlers to capture errors/unhandled rejections inside the worker
self.addEventListener("error", (ev: ErrorEvent) => {
  try {
    console.error(TAG, "Uncaught error in worker:", ev.message, ev.filename, ev.lineno, ev.colno, ev.error);
  } catch {
    console.error(TAG, "Uncaught error in worker (failed to stringify event)", ev);
  }
});

self.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
  try {
    console.error(TAG, "Unhandled promise rejection in worker:", ev.reason);
  } catch {
    console.error(TAG, "Unhandled promise rejection in worker (failed to stringify reason)", ev);
  }
});

try {
  const dbService = new DexieDBService();

  const api: IDBService = {
    initialize: async (options) => {
      console.log(TAG, "initialize called", { appId: options?.appId });
      const start = Date.now();
      try {
        const res = await dbService.initialize(options);
        console.log(TAG, "initialize completed", { durationMs: Date.now() - start });
        return res;
      } catch (err) {
        console.error(TAG, "initialize failed:", err);
        throw err;
      }
    },

    scanAllNotes: async (notes) => {
      const count = notes?.length ?? 0;
      const bytes = estimateNotesBytes(notes);
      console.log(TAG, "scanAllNotes called", { count, approxBytes: bytes });
      const start = Date.now();
      try {
        const res = await dbService.scanAllNotes(notes);
        console.log(TAG, "scanAllNotes completed", { durationMs: Date.now() - start, count });
        return res;
      } catch (err) {
        console.error(TAG, "scanAllNotes failed:", err);
        throw err;
      }
    },

    onFileChanged: async (note) => {
      console.log(TAG, "onFileChanged called", { path: note?.path, len: note?.content?.length ?? 0 });
      const start = Date.now();
      try {
        const res = await dbService.onFileChanged(note);
        console.log(TAG, "onFileChanged completed", { durationMs: Date.now() - start });
        return res;
      } catch (err) {
        console.error(TAG, "onFileChanged failed:", err);
        throw err;
      }
    },

    onFileDeleted: async (path) => {
      console.log(TAG, "onFileDeleted called", { path });
      const start = Date.now();
      try {
        const res = await dbService.onFileDeleted(path);
        console.log(TAG, "onFileDeleted completed", { durationMs: Date.now() - start });
        return res;
      } catch (err) {
        console.error(TAG, "onFileDeleted failed:", err);
        throw err;
      }
    },

    onFileRenamed: async (note, oldPath) => {
      console.log(TAG, "onFileRenamed called", { oldPath, newPath: note?.path });
      const start = Date.now();
      try {
        const res = await dbService.onFileRenamed(note, oldPath);
        console.log(TAG, "onFileRenamed completed", { durationMs: Date.now() - start });
        return res;
      } catch (err) {
        console.error(TAG, "onFileRenamed failed:", err);
        throw err;
      }
    },

    getAllActiveDates: async () => {
      console.log(TAG, "getAllActiveDates called");
      const start = Date.now();
      try {
        const res = await dbService.getAllActiveDates();
        console.log(TAG, "getAllActiveDates completed", { durationMs: Date.now() - start, count: res?.length });
        return res;
      } catch (err) {
        console.error(TAG, "getAllActiveDates failed:", err);
        throw err;
      }
    },

    getMemos: async (params) => {
      console.log(TAG, "getMemos called", { params });
      const start = Date.now();
      try {
        const res = await dbService.getMemos(params);
        console.log(TAG, "getMemos completed", { durationMs: Date.now() - start, count: res?.length });
        return res;
      } catch (err) {
        console.error(TAG, "getMemos failed:", err);
        throw err;
      }
    },

    countMemos: async (topicId) => {
      console.log(TAG, "countMemos called", { topicId });
      const start = Date.now();
      try {
        const res = await dbService.countMemos(topicId);
        console.log(TAG, "countMemos completed", { durationMs: Date.now() - start, result: res });
        return res;
      } catch (err) {
        console.error(TAG, "countMemos failed:", err);
        throw err;
      }
    },

    dispose: async () => {
      console.log(TAG, "dispose called");
      try {
        const res = await dbService.dispose();
        console.log(TAG, "dispose completed");
        return res;
      } catch (err) {
        console.error(TAG, "dispose failed:", err);
        throw err;
      }
    },
  };

  Comlink.expose(api);
  console.log(TAG, "Worker exposed!");
} catch (e) {
  console.error(TAG, "Worker init error:", e);
}
