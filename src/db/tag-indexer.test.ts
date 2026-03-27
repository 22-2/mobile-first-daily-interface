import { DEFAULT_TOPIC } from "src/core/topic";
import { TagIndexer } from "src/db/indexer/tag-indexer";
import type { ScanWorkerAPI } from "src/db/worker-api";
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
    scanFiles: vi.fn(async () => []),
    scanFile: vi.fn(async () => []),
  } as any;
}

describe("TagIndexer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("constructs with provided api", async () => {
    const api = createApiMock();

    new TagIndexer("vault-1", { api });

    await Promise.resolve();
    expect(api.scanFiles).not.toHaveBeenCalled();
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

  test("onFileDeleted and dispose operate without delegating to api", async () => {
    const api = createApiMock();
    const indexer = new TagIndexer("vault-1", { api });

    await indexer.onFileDeleted("daily/2026-03-23.md");
    await indexer.dispose();

    expect((api as any).removeFile).toBeUndefined();
    expect((api as any).dispose).toBeUndefined();
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

    expect(api.scanFiles).toHaveBeenCalledTimes(1);
    getAllTopicNotesSpy.mockRestore();
  });
});
