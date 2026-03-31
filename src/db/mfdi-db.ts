import type { Granularity } from "src/ui/types";

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------

export interface MemoRecord {
  id: string;
  path: string;
  noteName: string;
  topicId: string;
  noteGranularity: Granularity;
  content: string;
  tags: string[];
  metadataJson: string;
  startOffset: number;
  endOffset: number;
  bodyStartOffset: number;
  createdAt: string;
  noteDate: string; // YYYY-MM-DD
  updatedAt: string;
  archived: 0 | 1;
  deleted: 0 | 1;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

export interface TagStatRecord {
  tag: string;
  count: number;
  updatedAt: string;
}

export function getMFDIDatabaseName(appId: string): string {
  return `${appId}-mfdi-db`;
}

// ---------------------------------------------------------------------------
// Low-level IDB helpers
// ---------------------------------------------------------------------------

/** IDBRequest を Promise に変換 */
function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * カーソルを走査して配列を返す。
 * filter / limit はすべてここで完結させる。
 */
function cursorAll<T>(
  source: IDBIndex | IDBObjectStore,
  range: IDBKeyRange | null,
  direction: IDBCursorDirection,
  filter?: (v: T) => boolean,
  limit?: number,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    const cursorReq = source.openCursor(range, direction);

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor || (limit != null && results.length >= limit)) {
        return resolve(results);
      }
      const value = cursor.value as T;
      if (!filter || filter(value)) {
        results.push(value);
      }
      cursor.continue();
    };

    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

/** content の部分一致フィルタを生成。query が空なら undefined を返す */
function buildContentFilter(
  query?: string,
): ((m: MemoRecord) => boolean) | undefined {
  if (!query) return undefined;
  const lowerQuery = query.toLowerCase();
  return (m) => m.content.toLowerCase().includes(lowerQuery);
}

// ---------------------------------------------------------------------------
// Store accessor types
// ---------------------------------------------------------------------------

/** トランザクション取得コールバック */
type StoreResolver = (
  name: string,
  mode: IDBTransactionMode,
) => Promise<IDBObjectStore>;

// ---------------------------------------------------------------------------
// Store accessor classes
// ---------------------------------------------------------------------------

class MemoStore {
  readonly _name = "memos" as const;
  constructor(private readonly getStore: StoreResolver) {}

  clear(): Promise<undefined> {
    return this.store("readwrite").then((s) => req(s.clear()));
  }

  get(id: string): Promise<MemoRecord | undefined> {
    return this.store("readonly").then((s) => req(s.get(id)));
  }

  put(item: MemoRecord): Promise<IDBValidKey> {
    return this.store("readwrite").then((s) => req(s.put(item)));
  }

  delete(id: string): Promise<undefined> {
    return this.store("readwrite").then((s) => req(s.delete(id)));
  }

  toArray(): Promise<MemoRecord[]> {
    return this.store("readonly").then((s) => req(s.getAll()));
  }

  async bulkPut(items: MemoRecord[]): Promise<void> {
    const s = await this.store("readwrite");
    await Promise.all(items.map((item) => req(s.put(item))));
  }

  where(indexName: string) {
    return {
      equals: (value: unknown) => ({
        toArray: async (): Promise<MemoRecord[]> => {
          const s = await this.store("readonly");
          return req(s.index(indexName).getAll(IDBKeyRange.only(value)));
        },
        delete: async (): Promise<void> => {
          const s = await this.store("readwrite");
          const request = s
            .index(indexName)
            .openKeyCursor(IDBKeyRange.only(value));
          return new Promise<void>((resolve, reject) => {
            request.onsuccess = () => {
              const cursor = request.result;
              if (cursor) {
                s.delete(cursor.primaryKey);
                cursor.continue();
              } else {
                resolve();
              }
            };
            request.onerror = () => reject(request.error);
          });
        },
      }),
    };
  }

  private store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return this.getStore(this._name, mode);
  }
}

class MetaStore {
  readonly _name = "meta" as const;
  constructor(private readonly getStore: StoreResolver) {}

  clear(): Promise<undefined> {
    return this.store("readwrite").then((s) => req(s.clear()));
  }

  put(item: MetaRecord): Promise<IDBValidKey> {
    return this.store("readwrite").then((s) => req(s.put(item)));
  }

  get(key: string): Promise<MetaRecord | undefined> {
    return this.store("readonly").then((s) => req(s.get(key)));
  }

  private store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return this.getStore(this._name, mode);
  }
}

class TagStatStore {
  readonly _name = "tagStats" as const;
  constructor(private readonly getStore: StoreResolver) {}

  clear(): Promise<undefined> {
    return this.store("readwrite").then((s) => req(s.clear()));
  }

  put(item: TagStatRecord): Promise<IDBValidKey> {
    return this.store("readwrite").then((s) => req(s.put(item)));
  }

  get(tag: string): Promise<TagStatRecord | undefined> {
    return this.store("readonly").then((s) => req(s.get(tag)));
  }

  toArray(): Promise<TagStatRecord[]> {
    return this.store("readonly").then((s) => req(s.getAll()));
  }

  async bulkPut(items: TagStatRecord[]): Promise<void> {
    const s = await this.store("readwrite");
    await Promise.all(items.map((item) => req(s.put(item))));
  }

  async bulkGet(tags: string[]): Promise<(TagStatRecord | undefined)[]> {
    const s = await this.store("readonly");
    return Promise.all(tags.map((tag) => req(s.get(tag))));
  }

  async bulkDelete(tags: string[]): Promise<void> {
    const s = await this.store("readwrite");
    await Promise.all(tags.map((tag) => req(s.delete(tag))));
  }

  private store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return this.getStore(this._name, mode);
  }
}

// ---------------------------------------------------------------------------
// Transaction context
// ---------------------------------------------------------------------------

type StoreName = "memos" | "meta" | "tagStats";

interface TransactableStore {
  readonly _name: StoreName;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const DB_VERSION = 6;

/**
 * Dexie を完全に排除し、生の IndexedDB をラップしたデータベースクラス。
 *
 * 【設計意図（メンタルモデル）】
 * 1. 既存の Repository や Service との互換性を最小限の変更で維持するため、
 *    Dexie の API サブセット（memos.where(...).equals(...).toArray() 等）をエミュレートしています。
 * 2. 生の IDBTransaction は、イベントループのティックやリクエストの有無で自動コミットされるため、
 *    callback 内で非同期処理を行う transaction() メソッドでは Promise でライフサイクルを管理します。
 * 3. 複数の Repository が同じトランザクションを共有できるよう、`_activeTx` による簡易的な
 *    トランザクション再利用（ネスト風の挙動）を実装しています。これにより、原子性を担保します。
 */
export class MFDIDatabase {
  private readonly _db: Promise<IDBDatabase>;
  private readonly _name: string;

  /** アクティブなトランザクションのスタック（ネスト対応） */
  private _txStack: IDBTransaction[] = [];

  // store accessor インスタンスは一度だけ生成する
  readonly memos: MemoStore;
  readonly meta: MetaStore;
  readonly tagStats: TagStatStore;

  constructor(appId: string) {
    this._name = getMFDIDatabaseName(appId);
    this._db = this.openDatabase();

    const getStore: StoreResolver = (name, mode) =>
      this.resolveStore(name as StoreName, mode);

    this.memos = new MemoStore(getStore);
    this.meta = new MetaStore(getStore);
    this.tagStats = new TagStatStore(getStore);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async open(): Promise<this> {
    await this._db;
    return this;
  }

  async close(): Promise<void> {
    const db = await this._db;
    db.close();
  }

  async delete(): Promise<void> {
    await this.close();
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.deleteDatabase(this._name);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  // ---------------------------------------------------------------------------
  // Transaction
  // ---------------------------------------------------------------------------

  async transaction<T>(
    mode: "rw" | "r",
    stores: TransactableStore[],
    callback: () => Promise<T>,
  ): Promise<T> {
    const db = await this._db;
    const storeNames = stores.map((s) => s._name);
    const idbMode: IDBTransactionMode =
      mode === "rw" ? "readwrite" : "readonly";
    const tx = db.transaction(storeNames, idbMode);

    this._txStack.push(tx);
    const cleanup = () => {
      this._txStack = this._txStack.filter((item) => item !== tx);
    };

    return new Promise<T>((resolve, reject) => {
      let result: T;
      let callbackError: unknown;

      tx.oncomplete = () => {
        cleanup();
        resolve(result);
      };
      tx.onerror = () => {
        cleanup();
        reject(callbackError ?? tx.error);
      };
      tx.onabort = () => {
        cleanup();
        reject(callbackError ?? new Error("Transaction aborted"));
      };

      callback()
        .then((res) => {
          result = res;
        })
        .catch((err) => {
          callbackError = err;
          tx.abort();
        });
    });
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getAllActiveDates(): Promise<string[]> {
    const memos = await this.withStoreCallback(
      "memos",
      "readonly",
      async (s) => {
        const index = s.index("[archived+deleted]");
        const range = IDBKeyRange.only([0, 0]);
        return cursorAll<MemoRecord>(index, range, "next", undefined, undefined);
      },
    );
    const dateSet = new Set(memos.map((m) => m.noteDate));
    return Array.from(dateSet).sort();
  }

  async getLatestVisibleMemos(
    topicId?: string,
    limit = 300,
    query?: string,
  ): Promise<MemoRecord[]> {
    return this.withStoreCallback("memos", "readonly", async (s) => {
      const { index, range } = topicId
        ? {
            index: s.index("[topicId+archived+deleted+createdAt]"),
            range: IDBKeyRange.bound(
              [topicId, 0, 0, ""],
              [topicId, 0, 0, "\uffff"],
            ),
          }
        : {
            index: s.index("[archived+deleted+createdAt]"),
            range: IDBKeyRange.bound([0, 0, ""], [0, 0, "\uffff"]),
          };

      return cursorAll<MemoRecord>(
        index,
        range,
        "prev",
        buildContentFilter(query),
        limit || 300,
      );
    });
  }

  async countVisibleMemos(topicId?: string): Promise<number> {
    return this.withStoreCallback("memos", "readonly", async (s) => {
      if (topicId) {
        return req(
          s
            .index("[topicId+archived+deleted]")
            .count(IDBKeyRange.only([topicId, 0, 0])),
        );
      }
      return req(s.index("[archived+deleted]").count(IDBKeyRange.only([0, 0])));
    });
  }

  async getVisibleMemosByDateRange(params: {
    topicId?: string;
    startDate: string;
    endDate: string;
    limit?: number;
    query?: string;
  }): Promise<MemoRecord[]> {
    const { topicId, startDate, endDate, limit, query: searchQuery } = params;

    return this.withStoreCallback("memos", "readonly", async (s) => {
      const { index, range } = topicId
        ? {
            index: s.index("[topicId+archived+deleted+createdAt]"),
            range: IDBKeyRange.bound(
              [topicId, 0, 0, startDate],
              [topicId, 0, 0, endDate],
            ),
          }
        : {
            index: s.index("[archived+deleted+createdAt]"),
            range: IDBKeyRange.bound([0, 0, startDate], [0, 0, endDate]),
          };

      // console.log(`[MFDIDatabase] getVisibleMemosByDateRange: topicId="${topicId}", range=[${startDate}, ${endDate}], limit=${limit}`);

      return cursorAll<MemoRecord>(
        index,
        range,
        "prev",
        buildContentFilter(searchQuery),
        limit || 300,
      ).then((results) => {
        // console.log(`[MFDIDatabase] getVisibleMemosByDateRange result count: ${results.length}`);
        return results;
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * アクティブなトランザクションがあればそれを再利用し、
   * なければ新規トランザクションを作成して store を返す。
   */
  private async resolveStore(
    name: StoreName,
    mode: IDBTransactionMode,
  ): Promise<IDBObjectStore> {
    // スタック末尾（最も内側）のトランザクションを優先して再利用
    for (let i = this._txStack.length - 1; i >= 0; i--) {
      const tx = this._txStack[i];
      if ([...tx.objectStoreNames].includes(name)) {
        // 要求されたモードが readonly なら再利用可能。
        // readwrite の場合、再利用する tx も readwrite である必要がある。
        if (mode === "readonly" || tx.mode === "readwrite") {
          return tx.objectStore(name);
        }
      }
    }

    const db = await this._db;
    return db.transaction(name, mode).objectStore(name);
  }

  /** store を取得してコールバックを実行する内部ユーティリティ */
  private async withStoreCallback<T>(
    name: StoreName,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    const store = await this.resolveStore(name, mode);
    return callback(store);
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const openReq = indexedDB.open(this._name, DB_VERSION);

      openReq.onupgradeneeded = () => {
        const db = openReq.result;
        MFDIDatabase.migrate(db, openReq.transaction!);
      };

      openReq.onsuccess = () => resolve(openReq.result);
      openReq.onerror = () => reject(openReq.error);
    });
  }

  /** スキーママイグレーション（onupgradeneeded から切り出し） */
  private static migrate(db: IDBDatabase, tx: IDBTransaction): void {
    // ---- memos --------------------------------------------------------------
    const memoStore = db.objectStoreNames.contains("memos")
      ? tx.objectStore("memos")
      : db.createObjectStore("memos", { keyPath: "id" });

    const addIndex = (
      name: string,
      keyPath: string | string[],
      opts?: IDBIndexParameters,
    ) => {
      if (!memoStore.indexNames.contains(name)) {
        memoStore.createIndex(name, keyPath, opts);
      }
    };

    addIndex("path", "path");
    addIndex("noteName", "noteName");
    addIndex("topicId", "topicId");
    addIndex("noteGranularity", "noteGranularity");
    addIndex("noteDate", "noteDate");
    addIndex("tags", "tags", { multiEntry: true });
    addIndex("createdAt", "createdAt");
    addIndex("updatedAt", "updatedAt");
    addIndex("archived", "archived");
    addIndex("deleted", "deleted");
    addIndex("[topicId+noteGranularity]", ["topicId", "noteGranularity"]);
    addIndex("[archived+deleted]", ["archived", "deleted"]);
    addIndex("[topicId+archived+deleted]", ["topicId", "archived", "deleted"]);
    addIndex("[archived+deleted+createdAt]", [
      "archived",
      "deleted",
      "createdAt",
    ]);
    addIndex("[topicId+archived+deleted+createdAt]", [
      "topicId",
      "archived",
      "deleted",
      "createdAt",
    ]);

    // ---- meta ---------------------------------------------------------------
    if (!db.objectStoreNames.contains("meta")) {
      db.createObjectStore("meta", { keyPath: "key" });
    }

    // ---- tagStats -----------------------------------------------------------
    if (!db.objectStoreNames.contains("tagStats")) {
      const tagStore = db.createObjectStore("tagStats", { keyPath: "tag" });
      tagStore.createIndex("count", "count");
      tagStore.createIndex("updatedAt", "updatedAt");
    }
  }
}
