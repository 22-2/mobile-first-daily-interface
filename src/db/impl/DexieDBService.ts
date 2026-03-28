import { DexieMemoRepository } from "src/db/impl/DexieMemoRepository";
import { DexieTagStatsRepository } from "src/db/impl/DexieTagStatsRepository";
import type {
  DBServiceOptions,
  IDBService,
} from "src/db/interfaces/IDBService";
import {
  MFDIDatabase,
  type MemoRecord,
  type TagStatRecord,
} from "src/db/mfdi-db";
import { buildMemoRecordsForNote } from "src/db/scan-note";
import type { ScannableNote } from "src/db/worker-api";

export class DexieDBService implements IDBService {
  private db: MFDIDatabase | null = null;
  private memoRepo: DexieMemoRepository | null = null;
  private tagStatsRepo: DexieTagStatsRepository | null = null;
  private channel: BroadcastChannel | null = null;

  async initialize(options: DBServiceOptions): Promise<void> {
    if (this.db) {
      this.db.close();
    }
    this.db = new MFDIDatabase(options.appId);
    this.memoRepo = new DexieMemoRepository(this.db);
    this.tagStatsRepo = new DexieTagStatsRepository(this.db);
    this.channel = new BroadcastChannel("mfdi-db-updates");
    await this.db.open();
  }

  private notify(detail?: any) {
    this.channel?.postMessage({ type: "mfdi-db-updated", detail });
  }

  async scanAllNotes(notes: ScannableNote[]): Promise<void> {
    if (!this.db || !this.memoRepo || !this.tagStatsRepo)
      throw new Error("DB not initialized");

    await this.db.transaction(
      "rw",
      this.db.memos,
      this.db.meta,
      this.db.tagStats,
      async () => {
        await this.memoRepo!.clear();
        await this.db!.meta.clear();
        await this.tagStatsRepo!.clear();

        const allRecords = notes.flatMap(buildMemoRecordsForNote);
        await this.memoRepo!.bulkPut(allRecords);
        await this.tagStatsRepo!.rebuild();
        await this.db!.meta.put({
          key: "lastFullScanAt",
          value: new Date().toISOString(),
        });
      },
    );

    this.notify();
  }

  async onFileChanged(note: ScannableNote): Promise<void> {
    if (!this.db || !this.memoRepo || !this.tagStatsRepo)
      throw new Error("DB not initialized");

    const records = buildMemoRecordsForNote(note);

    await this.db.transaction(
      "rw",
      this.db.memos,
      this.db.tagStats,
      async () => {
        const removed = await this.tagStatsRepo!.collectForPath(note.path);
        await this.memoRepo!.deleteByPath(note.path);
        if (records.length) await this.memoRepo!.bulkPut(records);

        const added = this.tagStatsRepo!.collectFromRecords(records);
        await this.tagStatsRepo!.applyDeltas(removed, added);
      },
    );

    this.notify({ path: note.path });
  }

  async onFileDeleted(path: string): Promise<void> {
    if (!this.db || !this.memoRepo || !this.tagStatsRepo)
      throw new Error("DB not initialized");

    await this.db.transaction(
      "rw",
      this.db.memos,
      this.db.tagStats,
      async () => {
        const removed = await this.tagStatsRepo!.collectForPath(path);
        await this.memoRepo!.deleteByPath(path);
        await this.tagStatsRepo!.applyDeltas(removed, new Map());
      },
    );

    this.notify({ path });
  }

  async onFileRenamed(note: ScannableNote, oldPath: string): Promise<void> {
    if (!this.db || !this.memoRepo || !this.tagStatsRepo)
      throw new Error("DB not initialized");

    await this.db.transaction(
      "rw",
      this.db.memos,
      this.db.tagStats,
      async () => {
        const removed = await this.tagStatsRepo!.collectForPath(oldPath);
        await this.memoRepo!.deleteByPath(oldPath);
        await this.tagStatsRepo!.applyDeltas(removed, new Map());
      },
    );

    await this.onFileChanged(note);
  }

  async getAllActiveDates(): Promise<string[]> {
    if (!this.memoRepo) throw new Error("DB not initialized");
    return await this.memoRepo.getAllActiveDates();
  }

  async getTagStats(): Promise<TagStatRecord[]> {
    if (!this.db) throw new Error("DB not initialized");
    return await this.db.tagStats.toArray();
  }

  async getMeta(key: string): Promise<string | undefined> {
    if (!this.db) throw new Error("DB not initialized");
    const rec = await this.db.meta.get(key);
    return rec ? (rec.value as string) : undefined;
  }

  async getMemos(params: {
    topicId?: string;
    startDate?: string;
    endDate?: string;
    query?: string;
    limit?: number;
  }): Promise<MemoRecord[]> {
    if (!this.memoRepo) throw new Error("DB not initialized");
    const { topicId, startDate, endDate, query, limit } = params;

    if (startDate && endDate) {
      return await this.memoRepo.getVisibleMemosByDateRange({
        topicId,
        startDate,
        endDate,
        query,
        limit,
      });
    }

    return await this.memoRepo.getLatestVisibleMemos(topicId, limit, query);
  }

  async countMemos(topicId?: string): Promise<number> {
    if (!this.memoRepo) throw new Error("DB not initialized");
    return await this.memoRepo.countVisibleMemos(topicId);
  }

  async dispose(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
    this.channel?.close();
  }
}
