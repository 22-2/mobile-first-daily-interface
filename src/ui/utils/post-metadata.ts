import { TAG_METADATA_KEY, parseMfdiTags } from "src/utils/tags";

export function getPostTags(metadata: Record<string, string>): string[] {
  return parseMfdiTags(metadata);
}

export function isArchived(metadata: Record<string, string>): boolean {
  return metadata.archived != null && metadata.archived.length > 0;
}

export function isDeleted(metadata: Record<string, string>): boolean {
  return metadata.deleted != null && metadata.deleted.length > 0;
}

export function getPostedAt(metadata: Record<string, string>): string | null {
  return metadata.posted ?? null;
}

export function getRawTagMetadata(metadata: Record<string, string>): string {
  return metadata[TAG_METADATA_KEY] ?? "";
}
