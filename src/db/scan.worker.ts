import * as Comlink from "comlink";
import { MFDIDatabase } from "src/db/mfdi-db";
import { buildMemoRecordsForNote } from "src/db/scan-note";
import type { ScanWorkerAPI } from "src/db/worker-api";

let database: MFDIDatabase | null = null;

function requireDatabase(): MFDIDatabase {
  if (!database) {
    throw new Error("MFDI database is not initialized");
  }

  return database;
}

async function rebuildTagStatsTable(db: MFDIDatabase): Promise<void> {
  const memos = await db.memos.toArray();
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
  await db.tagStats.clear();
  if (counts.size === 0) {
    return;
  }

  await db.tagStats.bulkPut(
    [...counts.entries()].map(([tag, count]) => ({ tag, count, updatedAt })),
  );
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
    await db.transaction("rw", db.memos, db.meta, db.tagStats, async () => {
      await db.memos.clear();
      await db.meta.clear();
      await db.tagStats.clear();
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

    await db.transaction("rw", db.memos, db.tagStats, async () => {
      await db.memos.where("path").equals(file.path).delete();
      if (records.length > 0) {
        await db.memos.bulkPut(records);
      }
      await rebuildTagStatsTable(db);
    });
  },

  async removeFile(path) {
    const db = requireDatabase();
    await db.transaction("rw", db.memos, db.tagStats, async () => {
      await db.memos.where("path").equals(path).delete();
      await rebuildTagStatsTable(db);
    });
  },

  async rebuildTagStats() {
    const db = requireDatabase();
    await db.transaction("rw", db.tagStats, db.memos, async () => {
      await rebuildTagStatsTable(db);
    });
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
