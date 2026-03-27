import { DEFAULT_TOPIC } from "src/core/topic";
import { TagIndexer } from "src/db/indexer/tag-indexer";
import { WorkerClient } from "src/db/worker-client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("src/db/worker-client", () => ({
  WorkerClient: {
    get: vi.fn(),
  },
}));

function createShell(overrides: Record<string, unknown> = {}) {
  return {
    cachedReadFile: vi.fn(async () => "## Thino\n- 10:00:00 hello"),
    getCommunityPlugin: vi.fn(() => undefined),
    getInternalPluginById: vi.fn(() => undefined),
    ...overrides,
  } as any;
}

function createApiMock() {
  return {
    scanAllNotes: vi.fn(async () => []),
    onFileChanged: vi.fn(async () => []),
    onFileDeleted: vi.fn(async () => []),
    onFileRenamed: vi.fn(async () => []),
  } as any;
}

describe("TagIndexer", () => {
  let api: any;

  beforeEach(() => {
    api = createApiMock();
    vi.mocked(WorkerClient.get).mockReturnValue(api);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("onFileChanged scans known note files", async () => {
    const indexer = new TagIndexer("vault-1");
    const shell = createShell();
    const file = {
      path: "daily/writing-2026-03.md",
      basename: "writing-2026-03",
    } as any;

    await indexer.onFileChanged(shell, file, {
      topics: [DEFAULT_TOPIC, { id: "writing", title: "Writing" }],
    } as any);

    expect(shell.cachedReadFile).toHaveBeenCalledWith(file);
    expect(api.onFileChanged).toHaveBeenCalledTimes(1);
    expect(api.onFileChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "daily/writing-2026-03.md",
        noteName: "writing-2026-03",
        topicId: "writing",
        noteGranularity: "month",
        content: "## Thino\n- 10:00:00 hello",
      }),
    );
  });

  test("onFileChanged ignores non-note files", async () => {
    const indexer = new TagIndexer("vault-1");
    const shell = createShell();

    await indexer.onFileChanged(
      shell,
      { path: "misc/random.md", basename: "random" } as any,
      { topics: [DEFAULT_TOPIC] } as any,
    );

    expect(shell.cachedReadFile).not.toHaveBeenCalled();
    expect(api.onFileChanged).not.toHaveBeenCalled();
  });

  test("onFileDeleted delegates to api", async () => {
    const indexer = new TagIndexer("vault-1");

    await indexer.onFileDeleted("daily/2026-03-23.md");

    expect(api.onFileDeleted).toHaveBeenCalledWith("daily/2026-03-23.md");
  });

  test("scanAllNotes delegates to api", async () => {
    const indexer = new TagIndexer("vault-1", { scanChunkSize: 1 });
    const file = { basename: "2026-03-23", path: "daily/2026-03-23.md" };
    const shell = createShell();

    const dailyNotesModule = await import("src/lib/daily-notes");
    const getAllTopicNotesSpy = vi
      .spyOn(dailyNotesModule, "getAllTopicNotes")
      .mockImplementation(
        (_, granularity) =>
          (granularity === "day" ? { day: file as any } : {}) as Record<
            string,
            any
          >,
      );

    await indexer.scanAllNotes(shell, { topics: [DEFAULT_TOPIC] } as any);

    expect(api.scanAllNotes).toHaveBeenCalledTimes(1);
    getAllTopicNotesSpy.mockRestore();
  });
});
