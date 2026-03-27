import type { MemoRecord } from "src/db/mfdi-db";
import type { ScannableNote } from "src/db/worker-api";

export interface DBServiceOptions {
  appId: string;
}

export interface IDBService {
  /**
   * データベースを初期化し、接続を開始する
   */
  initialize(options: DBServiceOptions): Promise<void>;

  /**
   * 全てのノートをスキャンして再インデックスする
   */
  scanAllNotes(notes: ScannableNote[]): Promise<void>;

  /**
   * 単一のノートをスキャンしてインデックスを更新する
   */
  onFileChanged(note: ScannableNote): Promise<void>;

  /**
   * ファイル削除時のインデックス更新
   */
  onFileDeleted(path: string): Promise<void>;

  /**
   * ファイル名変更時のインデックス更新
   */
  onFileRenamed(note: ScannableNote, oldPath: string): Promise<void>;

  /**
   * 投稿が存在する日付をすべて取得する
   */
  getAllActiveDates(): Promise<string[]>;

  /**
   * 指定した条件でメモを取得する
   */
  getMemos(params: {
    topicId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<MemoRecord[]>;

  /**
   * 指定した条件のメモ総数を取得する
   */
  countMemos(topicId?: string): Promise<number>;

  /**
   * 接続を閉じる
   */
  dispose(): Promise<void>;
}
