import Dexie, { type EntityTable } from "dexie";
import { Granularity } from "src/ui/types";

export interface MemoRecord {
  id: string;
  path: string;
  noteName: string;
  topicId: string;
  noteGranularity: Granularity;
  content: string;
  tags: string[];
  metadataJson: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  deleted: boolean;
}

export interface MetaRecord {
  key: string;
  value: string;
}

export function getMFDIDatabaseName(appId: string): string {
  return `${appId}-mfdi-db`;
}

export class MFDIDatabase extends Dexie {
  memos!: EntityTable<MemoRecord, "id">;
  meta!: EntityTable<MetaRecord, "key">;

  constructor(appId: string) {
    super(getMFDIDatabaseName(appId));

    this.version(1).stores({
      memos:
        "id, path, noteName, topicId, noteGranularity, *tags, createdAt, updatedAt, archived, deleted, [topicId+noteGranularity]",
      meta: "key",
    });
  }
}
