export interface Topic {
  /** ファイル名プレフィックス。空文字 = デフォルト（変更・削除不可） */
  id: string;
  /** 表示名 */
  title: string;
  /** アーカイブ済みかどうか */
  archived?: boolean;
}

export const DEFAULT_TOPIC: Topic = {
  id: "",
  title: "デフォルト",
  archived: false,
};
