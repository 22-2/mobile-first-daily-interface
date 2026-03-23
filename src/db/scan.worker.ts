import * as Comlink from "comlink";
import { MFDIDatabase } from "src/db/mfdi-db";
import { buildMemoRecordsForNote } from "src/db/scan-note";
import { ScanWorkerAPI } from "src/db/worker-api";

let database: MFDIDatabase | null = null;

function requireDatabase(): MFDIDatabase {
  if (!database) {
    throw new Error("MFDI database is not initialized");
  }

  return database;
}

const workerApi: ScanWorkerAPI = {
  async initialize({ appId }) {
    if (database) {
      database.close();
    }

    database = new MFDIDatabase(appId);
    await database.open();
  },

  async resetIndex() {
    const db = requireDatabase();
    await db.transaction("rw", db.memos, db.meta, async () => {
      await db.memos.clear();
      await db.meta.clear();
    });
  },

  async scanFiles(files) {
    const db = requireDatabase();
    const records = files.flatMap(buildMemoRecordsForNote);
    if (records.length === 0) {
      return;
    }

    await db.memos.bulkPut(records);
  },

  async scanFile(file) {
    const db = requireDatabase();
    const records = buildMemoRecordsForNote(file);

    await db.transaction("rw", db.memos, async () => {
      await db.memos.where("path").equals(file.path).delete();
      if (records.length > 0) {
        await db.memos.bulkPut(records);
      }
    });
  },

  async removeFile(path) {
    const db = requireDatabase();
    await db.memos.where("path").equals(path).delete();
  },

  async setMeta(key, value) {
    const db = requireDatabase();
    await db.meta.put({ key, value });
  },

  async dispose() {
    if (!database) {
      return;
    }

    database.close();
    database = null;
  },
};

Comlink.expose(workerApi);
