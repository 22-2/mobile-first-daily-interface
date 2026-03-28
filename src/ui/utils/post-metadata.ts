import { parseMfdiTags, TAG_METADATA_KEY } from "src/core/tags";

export function getPostTags(metadata: Record<string, string>): string[] {
  return parseMfdiTags(metadata);
}

export function isArchived(metadata: Record<string, string>): boolean {
  return metadata.archived != null && metadata.archived.length > 0;
}

export function isDeleted(metadata: Record<string, string>): boolean {
  return metadata.deleted != null && metadata.deleted.length > 0;
}

// Helper: 投稿がユーザーに表示されるべきかを判定するユーティリティ。
// 理由: アーカイブ済み・削除済みのチェックが複数箇所で繰り返されていた
// （ボイラープレートになっている）ため、意図を明確にして再利用可能にする。
export function isVisible(metadata: Record<string, string>): boolean {
  return !isArchived(metadata) && !isDeleted(metadata);
}
function getPostedAt(metadata: Record<string, string>): string | null {
  return metadata.posted ?? null;
}

export function getRawTagMetadata(metadata: Record<string, string>): string {
  return metadata[TAG_METADATA_KEY] ?? "";
}
