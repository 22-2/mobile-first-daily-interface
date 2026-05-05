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
  private queue: Promise<void> = Promise.resolve();
  // 意図: getTagStats等の読み取りメソッドが初期化前に呼ばれた場合、
  // DBの初期化完了まで待機する。ただし、await時点のPromiseを別変数で参照することで、
  // await中に initPromise が更新されても古い参照を待ち続けるため、race conditionを防ぐ。
  // 初期値を Promise.resolve() にすると await が即座に完了するため、
  // 最初の読み取り前に initialize が必ず呼ばれるか、または initPromise が
  // 常に「呼び出し時点での」最新のPromiseを参照する仕組みが必要。
  private _initResolve: (() => void) | null = null;
  private initPromise: Promise<void> = new Promise<void>((resolve) => {
    this._initResolve = resolve;
  });

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          resolve(await task());
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async initialize(options: DBServiceOptions): Promise<void> {
    if (this.db) {
      this.db.close();
    }
    this.db = new MFDIDatabase(options.appId);
    this.memoRepo = new DexieMemoRepository(this.db);
    this.tagStatsRepo = new DexieTagStatsRepository(this.db);
    this.channel = new BroadcastChannel("mfdi-db-updates");
    await this.db.open();
    // initPromise を resolve して、待機中のメソッドを続行させる
    if (this._initResolve) {
      this._initResolve();
    }
  }

  private notify(detail?: { path?: string }) {
    this.channel?.postMessage({ type: "mfdi-db-updated", detail });
  }

  async scanAllNotes(notes: ScannableNote[]): Promise<void> {
    return this.enqueue(async () => {
      if (!this.db || !this.memoRepo || !this.tagStatsRepo)
        throw new Error("DB not initialized");

      await this.memoRepo!.clear();
      await this.db!.meta.clear();
      await this.tagStatsRepo!.clear();

      const allRecords = notes.flatMap(buildMemoRecordsForNote);
      await this.memoRepo!.bulkPut(allRecords);

      const counts = this.tagStatsRepo!.collectFromRecords(allRecords);
      await this.tagStatsRepo!.applyDeltas(new Map(), counts);
      await this.db!.meta.put({
        key: "lastFullScanAt",
        value: new Date().toISOString(),
      });

      this.notify();
    });
  }

  async onFileChanged(note: ScannableNote): Promise<void> {
    return this.enqueue(async () => {
      if (!this.db || !this.memoRepo || !this.tagStatsRepo)
        throw new Error("DB not initialized");

      const records = buildMemoRecordsForNote(note);

      const removed = await this.tagStatsRepo!.collectForPath(note.path);
      await this.memoRepo!.deleteByPath(note.path);
      if (records.length) await this.memoRepo!.bulkPut(records);

      const added = this.tagStatsRepo!.collectFromRecords(records);
      await this.tagStatsRepo!.applyDeltas(removed, added);

      this.notify({ path: note.path });
    });
  }

  async onFileDeleted(path: string): Promise<void> {
    return this.enqueue(async () => {
      if (!this.db || !this.memoRepo || !this.tagStatsRepo)
        throw new Error("DB not initialized");

      const removed = await this.tagStatsRepo!.collectForPath(path);
      await this.memoRepo!.deleteByPath(path);
      await this.tagStatsRepo!.applyDeltas(removed, new Map());

      this.notify({ path });
    });
  }

  async onFileRenamed(note: ScannableNote, oldPath: string): Promise<void> {
    return this.enqueue(async () => {
      if (!this.db || !this.memoRepo || !this.tagStatsRepo)
        throw new Error("DB not initialized");

      const removed = await this.tagStatsRepo!.collectForPath(oldPath);
      await this.memoRepo!.deleteByPath(oldPath);
      await this.tagStatsRepo!.applyDeltas(removed, new Map());

      // Then process the new note content
      const records = buildMemoRecordsForNote(note);
      if (records.length) await this.memoRepo!.bulkPut(records);
      const added = this.tagStatsRepo!.collectFromRecords(records);
      await this.tagStatsRepo!.applyDeltas(new Map(), added);

      this.notify({ path: note.path });
    });
  }

  async getAllActiveDates(): Promise<string[]> {
    await this.initPromise;
    if (!this.memoRepo) throw new Error("DB not initialized");
    return await this.memoRepo.getAllActiveDates();
  }

  async getTagStats(): Promise<TagStatRecord[]> {
    await this.initPromise;
    if (!this.db) throw new Error("DB not initialized");
    return await this.db.tagStats.toArray();
  }

  async getMeta(key: string): Promise<string | undefined> {
    await this.initPromise;
    if (!this.db) throw new Error("DB not initialized");
    const rec = await this.db.meta.get(key);
    return rec ? (rec.value as string) : undefined;
  }

  async getMemos(params: {
    topicId?: string;
    startDate?: string;
    endDate?: string;
    query?: string;
    threadOnly?: boolean;
    limit?: number;
  }): Promise<MemoRecord[]> {
    await this.initPromise;
    if (!this.memoRepo) throw new Error("DB not initialized");
    const { topicId, startDate, endDate, query, threadOnly, limit } = params;

    if (startDate && endDate) {
      return await this.memoRepo.getVisibleMemosByDateRange({
        topicId,
        startDate,
        endDate,
        query,
        threadOnly,
        limit,
      });
    }

    return await this.memoRepo.getLatestVisibleMemos(
      topicId,
      limit,
      query,
      threadOnly,
    );
  }

  async getPinnedMemos(params: {
    topicId?: string;
    query?: string;
    threadOnly?: boolean;
    limit?: number;
  }): Promise<MemoRecord[]> {
    await this.initPromise;
    if (!this.memoRepo) throw new Error("DB not initialized");
    return await this.memoRepo.getPinnedVisibleMemos(params);
  }

  async countMemos(topicId?: string): Promise<number> {
    await this.initPromise;
    if (!this.memoRepo) throw new Error("DB not initialized");
    return await this.memoRepo.countVisibleMemos(topicId);
  }

  async dispose(): Promise<void> {
    await this.initPromise;
    if (this.db) {
      await this.db.close();
    }
    this.channel?.close();
  }
}
