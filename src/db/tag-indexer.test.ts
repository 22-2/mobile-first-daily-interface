import { TagIndexer } from "src/db/tag-indexer";
import { ScanWorkerAPI } from "src/db/worker-api";
import { DEFAULT_TOPIC } from "src/core/topic";
import { afterEach, describe, expect, test, vi } from "vitest";

function createShell(overrides: Record<string, unknown> = {}) {
  return {
    cachedReadFile: vi.fn(async () => "## Thino\n- 10:00:00 hello"),
    getCommunityPlugin: vi.fn(() => undefined),
    getInternalPluginById: vi.fn(() => undefined),
    ...overrides,
  } as any;
}

function createApiMock(): ScanWorkerAPI {
  return {
    initialize: vi.fn(async () => {}),
    resetIndex: vi.fn(async () => {}),
    scanFiles: vi.fn(async () => {}),
    scanFile: vi.fn(async () => {}),
    removeFile: vi.fn(async () => {}),
    rebuildTagStats: vi.fn(async () => {}),
    setMeta: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
  };
}

describe("TagIndexer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("initializes the worker api with appId", async () => {
    const api = createApiMock();

    new TagIndexer("vault-1", { api });

    await Promise.resolve();
    expect(api.initialize).toHaveBeenCalledWith({ appId: "vault-1" });
  });

  test("onFileChanged scans known note files", async () => {
    const api = createApiMock();
    const indexer = new TagIndexer("vault-1", { api });
    const shell = createShell();
    const file = {
      path: "daily/writing-2026-03.md",
      basename: "writing-2026-03",
    } as any;

    await indexer.onFileChanged(shell, file, {
      topics: [DEFAULT_TOPIC, { id: "writing", title: "Writing" }],
    } as any);

    expect(shell.cachedReadFile).toHaveBeenCalledWith(file);
    expect(api.scanFile).toHaveBeenCalledTimes(1);
    expect(api.scanFile).toHaveBeenCalledWith(
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
    const api = createApiMock();
    const indexer = new TagIndexer("vault-1", { api });
    const shell = createShell();

    await indexer.onFileChanged(
      shell,
      { path: "misc/random.md", basename: "random" } as any,
      { topics: [DEFAULT_TOPIC] } as any,
    );

    expect(shell.cachedReadFile).not.toHaveBeenCalled();
    expect(api.scanFile).not.toHaveBeenCalled();
  });

  test("onFileDeleted and dispose delegate to the worker api", async () => {
    const api = createApiMock();
    const indexer = new TagIndexer("vault-1", { api });

    await indexer.onFileDeleted("daily/2026-03-23.md");
    await indexer.dispose();

    expect(api.removeFile).toHaveBeenCalledWith("daily/2026-03-23.md");
    expect(api.dispose).toHaveBeenCalledTimes(1);
  });

  test("scanAllNotes rebuilds tag stats after scanning", async () => {
    const api = createApiMock();
    const indexer = new TagIndexer("vault-1", { api, scanChunkSize: 1 });
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

    expect(api.resetIndex).toHaveBeenCalledTimes(1);
    expect(api.scanFiles).toHaveBeenCalledTimes(1);
    expect(api.rebuildTagStats).toHaveBeenCalledTimes(1);
    getAllTopicNotesSpy.mockRestore();
  });
});
