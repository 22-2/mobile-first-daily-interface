import { beforeEach, describe, expect, it, vi } from "vitest";
import { DexieDBService } from "src/db/impl/DexieDBService";

describe("DexieDBService", () => {
  let service: DexieDBService;

  beforeEach(async () => {
    vi.useRealTimers();
    service = new DexieDBService();
    await service.initialize({ appId: "test-app" });
  });

  it("should scan and retrieve memos", async () => {
    const note = {
      path: "test.md",
      noteName: "test",
      topicId: "topic1",
      noteGranularity: "day" as const,
      noteDate: "2026-03-31",
      content: "## Thino\n- 12:00:00 hello world",
    };

    await service.scanAllNotes([note]);

    const memos = await service.getMemos({
      topicId: "topic1",
      startDate: "2026-03-31T00:00:00.000Z",
      endDate: "2026-03-31T23:59:59.999Z",
    });

    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe("hello world");
  });

  it("should retrieve memos without topicId", async () => {
    const note = {
      path: "test.md",
      noteName: "test",
      topicId: "topic1",
      noteGranularity: "day" as const,
      noteDate: "2026-03-31",
      content: "## Thino\n- 12:00:00 hello world",
    };

    await service.scanAllNotes([note]);

    const memos = await service.getMemos({
      startDate: "2026-03-31T00:00:00.000Z",
      endDate: "2026-03-31T23:59:59.999Z",
    });

    expect(memos).toHaveLength(1);
  });
});
