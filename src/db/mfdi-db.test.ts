import {
  getMFDIDatabaseName,
  MFDIDatabase,
  type MemoRecord,
} from "src/db/mfdi-db";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const databases: MFDIDatabase[] = [];

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(async () => {
  while (databases.length > 0) {
    const db = databases.pop();
    if (!db) {
      continue;
    }

    db.close();
    await db.delete();
  }
});

function createDatabase() {
  const db = new MFDIDatabase(`test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

function createMemo(overrides: Partial<MemoRecord> = {}): MemoRecord {
  return {
    id: "daily/2026-03-23.md:10",
    path: "daily/2026-03-23.md",
    noteName: "2026-03-23",
    topicId: "",
    noteGranularity: "day",
    content: "hello",
    tags: ["IT", "Later"],
    metadataJson: JSON.stringify({ mfditags: "IT, Later" }),
    createdAt: "2026-03-23T10:00:00.000Z",
    updatedAt: "2026-03-23T10:00:00.000Z",
    archived: 0,
    deleted: 0,
    bodyStartOffset: 0,
    startOffset: 0,
    endOffset: 0,
    noteDate: "2026-03-23",
    ...overrides,
  };
}

describe("MFDIDatabase", () => {
  test("uses appId-prefixed database name", () => {
    expect(getMFDIDatabaseName("vault-1")).toBe("vault-1-mfdi-db");
  });

  test("stores and retrieves memo records", async () => {
    const db = createDatabase();
    const memo = createMemo();

    await db.memos.put(memo);

    await expect(db.memos.get(memo.id)).resolves.toEqual(memo);
  });

  test("supports tag queries through the multi-entry index", async () => {
    const db = createDatabase();

    await db.memos.bulkPut([
      createMemo(),
      createMemo({
        id: "daily/2026-03-24.md:10",
        path: "daily/2026-03-24.md",
        noteName: "2026-03-24",
        tags: ["Writing"],
      }),
    ]);

    await expect(
      db.memos.where("tags").equals("IT").toArray(),
    ).resolves.toHaveLength(1);
    await expect(
      db.memos.where("tags").equals("Writing").toArray(),
    ).resolves.toHaveLength(1);
  });

  test("upserts memo records by id", async () => {
    const db = createDatabase();

    await db.memos.put(createMemo());
    await db.memos.put(createMemo({ content: "updated", tags: ["IT"] }));

    await expect(db.memos.toArray()).resolves.toHaveLength(1);
    await expect(db.memos.get("daily/2026-03-23.md:10")).resolves.toMatchObject(
      {
        content: "updated",
        tags: ["IT"],
      },
    );
  });

  test("stores aggregated tag stat records", async () => {
    const db = createDatabase();

    await db.tagStats.put({
      tag: "IT",
      count: 2,
      updatedAt: "2026-03-23T10:00:00.000Z",
    });

    await expect(db.tagStats.get("IT")).resolves.toEqual({
      tag: "IT",
      count: 2,
      updatedAt: "2026-03-23T10:00:00.000Z",
    });
  });
});
