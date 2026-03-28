import { DexieDBService } from "src/db/impl/DexieDBService";
import type { ScannableNote } from "src/db/worker-api";
import { beforeEach, describe, expect, it } from "vitest";

// BroadcastChannel polyfill for test environment
if (typeof BroadcastChannel === "undefined") {
  (globalThis as any).BroadcastChannel = class {
    postMessage() {}
    close() {}
  };
}

describe("DexieDBService", () => {
  let service: DexieDBService;

  beforeEach(async () => {
    service = new DexieDBService();
    await service.initialize({ appId: "test-app" });
  });

  it("should initialize and scan all notes", async () => {
    const notes: ScannableNote[] = [
      {
        path: "note1.md",
        noteName: "note1",
        topicId: "topic1",
        noteGranularity: "day",
        noteDate: "2023-10-27",
        content: "## Thino\n- 12:00:00 [mfditags::tag1]",
      },
    ];

    await service.scanAllNotes(notes);
    const memos = await service.getMemos({ topicId: "topic1" });
    expect(memos.length).toBe(1);
    expect(memos[0].path).toBe("note1.md");
    expect(memos[0].tags).toContain("tag1");
  });

  it("should handle file changes", async () => {
    const note: ScannableNote = {
      path: "note1.md",
      noteName: "note1",
      topicId: "topic1",
      noteGranularity: "day",
      noteDate: "2023-10-27",
      content: "## Thino\n- 12:00:00 [mfditags::tag1]",
    };

    await service.onFileChanged(note);
    let memos = await service.getMemos({ topicId: "topic1" });
    expect(memos.length).toBe(1);

    const updatedNote: ScannableNote = {
      ...note,
      content: "## Thino\n- 12:00:00 [mfditags::tag2]",
    };
    await service.onFileChanged(updatedNote);
    memos = await service.getMemos({ topicId: "topic1" });
    expect(memos.length).toBe(1);
    expect(memos[0].tags).toContain("tag2");
    expect(memos[0].tags).not.toContain("tag1");
  });

  it("should handle file deletion", async () => {
    const note: ScannableNote = {
      path: "note1.md",
      noteName: "note1",
      topicId: "topic1",
      noteGranularity: "day",
      noteDate: "2023-10-27",
      content: "## Thino\n- 12:00:00 [mfditags::tag1]",
    };

    await service.onFileChanged(note);
    await service.onFileDeleted("note1.md");
    const memos = await service.getMemos({ topicId: "topic1" });
    expect(memos.length).toBe(0);
  });
});
