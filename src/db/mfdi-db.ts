import Dexie, { type EntityTable } from "dexie";
import type { Granularity } from "src/ui/types";

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

interface MetaRecord {
  key: string;
  value: string;
}

interface TagStatRecord {
  tag: string;
  count: number;
  updatedAt: string;
}

export function getMFDIDatabaseName(appId: string): string {
  return `${appId}-mfdi-db`;
}

export class MFDIDatabase extends Dexie {
  memos!: EntityTable<MemoRecord, "id">;
  meta!: EntityTable<MetaRecord, "key">;
  tagStats!: EntityTable<TagStatRecord, "tag">;

  constructor(appId: string) {
    super(getMFDIDatabaseName(appId));

    this.version(6).stores({
      memos:
        "id, path, noteName, topicId, noteGranularity, noteDate, *tags, createdAt, updatedAt, archived, deleted, [topicId+noteGranularity], [archived+deleted], [topicId+archived+deleted], [archived+deleted+createdAt], [topicId+archived+deleted+createdAt]",
      meta: "key",
      tagStats: "tag, count, updatedAt",
    });
  }

  /**
   * 投稿が存在する日付をすべて取得する
   */
  async getAllActiveDates(): Promise<string[]> {
    const activeMemos = await this.memos
      .where("archived")
      .equals(0)
      .and((m) => m.deleted === 0)
      .toArray();

    const dateSet = new Set(activeMemos.map((m) => m.noteDate));
    return Array.from(dateSet).sort();
  }

  /**
   * 未アーカイブ・未削除のメモを最新順に取得する（インデックス検索）
   */
  async getLatestVisibleMemos(
    topicId?: string,
    limit = 300,
  ): Promise<MemoRecord[]> {
    if (topicId) {
      return await this.memos
        .where("[topicId+archived+deleted+createdAt]")
        .between([topicId, 0, 0, ""], [topicId, 0, 0, "\uffff"])
        .reverse()
        .limit(limit)
        .toArray();
    }

    return await this.memos
      .where("[archived+deleted+createdAt]")
      .between([0, 0, ""], [0, 0, "\uffff"])
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * 未アーカイブ・未削除のメモ総数を取得する（インデックス検索）
   */
  async countVisibleMemos(topicId?: string): Promise<number> {
    if (topicId) {
      return await this.memos
        .where("[topicId+archived+deleted]")
        .equals([topicId, 0, 0])
        .count();
    }

    return await this.memos
      .where("[archived+deleted]")
      .equals([0, 0] as any)
      .count();
  }

  /**
   * 指定期間内の未アーカイブ・未削除のメモを取得する（インデックス検索）
   */
  async getVisibleMemosByDateRange(params: {
    topicId?: string;
    startDate: string;
    endDate: string;
    limit?: number;
  }): Promise<MemoRecord[]> {
    const { topicId, startDate, endDate, limit } = params;
    let query;

    if (topicId) {
      query = this.memos
        .where("[topicId+archived+deleted+createdAt]")
        .between(
          [topicId, 0, 0, startDate],
          [topicId, 0, 0, endDate],
          true,
          true,
        );
    } else {
      query = this.memos
        .where("[archived+deleted+createdAt]")
        .between([0, 0, startDate], [0, 0, endDate], true, true);
    }

    if (limit) {
      query = query.reverse().limit(limit);
    } else {
      query = query.reverse();
    }

    return await query.toArray();
  }
}
