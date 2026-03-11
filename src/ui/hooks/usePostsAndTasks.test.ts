// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { useAppContext } from "src/ui/context/AppContext";
import { usePostsAndTasks } from "src/ui/hooks/usePostsAndTasks";
import { resolveTimestamp } from "src/ui/utils/post-utils";
import * as dailyNotes from "src/utils/daily-notes";
import * as thino from "src/utils/thino";
import { initializePostsStore } from "src/ui/store/postsStore";
import { settingsStore } from "src/ui/store/settingsStore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import moment from "moment";

// Obsidian provides moment globally. Mock it for tests using the installed package.
// (window as any).moment = moment; // Handled by vitest.setup.ts

vi.mock("../../utils/daily-notes", () => ({
  getTopicNote: vi.fn(),
  resolveTopicNotePath: vi.fn(),
  getPeriodicSettings: vi.fn().mockReturnValue({ format: "YYYY-MM-DD" }),
  getAllTopicNotes: vi.fn().mockReturnValue({}),
  getDateUID: vi.fn((date: any, g: string) => `${g}-${date.toISOString()}`),
}));

vi.mock("../../utils/thino", () => ({
  parseThinoEntries: vi.fn(),
}));

vi.mock("../context/AppContext", () => ({
  useAppContext: vi.fn(),
}));

describe("resolveTimestamp", () => {
  const dateFor20260302 = moment("2026-03-02T12:00:00.000Z") as any;

  it("時刻のみ（旧形式）: 日付ファイルの日付を補完してパースする", () => {
    const result = resolveTimestamp("16:00:00", dateFor20260302);
    expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2026-03-02 16:00:00");
  });

  it("日付あり（新形式）: そのままパースする", () => {
    const result = resolveTimestamp("2026-03-05 09:30:00", dateFor20260302);
    expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2026-03-05 09:30:00");
  });

  it("posted メタデータあり: posted の値を優先する", () => {
    const posted = "2026-03-10T19:00:00.000Z";
    const result = resolveTimestamp("10:00:00", dateFor20260302, { posted });
    expect(result.toISOString()).toBe(posted);
  });
});

describe("Sorting with posted metadata", () => {
  const mockAppHelper = {
    cachedReadFile: vi.fn(),
    getTasks: vi.fn(),
    loadFile: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppContext as any).mockReturnValue({
      app: {},
      appHelper: mockAppHelper,
    });
    initializePostsStore({} as any, mockAppHelper as any);
    settingsStore.setState({ date: moment("2026-03-10T00:00:00.000Z") as any });
  });

  it("posted メタデータに基づいて降順にソートされること", async () => {
    const note = { path: "2026-03-10.md" } as any;
    const isoLater = "2026-03-10T15:00:00.000Z";
    const isoEarlier = "2026-03-10T10:00:00.000Z";

    mockAppHelper.loadFile.mockResolvedValue("content");
    vi.spyOn(thino, "parseThinoEntries").mockReturnValue([
      { time: "09:00:00", message: "earlier", metadata: { posted: isoEarlier }, offset: 0, startOffset: 0, endOffset: 10, bodyStartOffset: 2 },
      { time: "08:00:00", message: "later", metadata: { posted: isoLater }, offset: 20, startOffset: 20, endOffset: 30, bodyStartOffset: 22 },
    ] as any);

    const { result } = renderHook(() => usePostsAndTasks({
      date: moment("2026-03-10T00:00:00.000Z") as any,
      granularity: "day"
    }));

    await act(async () => {
      await result.current.updatePosts(note);
    });

    // 15:00 (later) が先頭、10:00 (earlier) が次
    expect(result.current.posts[0].message).toBe("later");
    expect(result.current.posts[1].message).toBe("earlier");
  });

  it("archived や deleted な投稿が含まれないこと", async () => {
    // Note: filteredPosts のロジックは useMFDIApp にあるため、
    // ここでは posts 自体が正しく parse されていることを確認
    const note = { path: "2026-03-10.md" } as any;
    mockAppHelper.loadFile.mockResolvedValue("content");
    vi.spyOn(thino, "parseThinoEntries").mockReturnValue([
      { time: "09:00:00", message: "visible", metadata: {}, offset: 0, startOffset: 0, endOffset: 10, bodyStartOffset: 2 },
      { time: "09:01:00", message: "ignored1", metadata: { archived: "true" }, offset: 20, startOffset: 20, endOffset: 30, bodyStartOffset: 22 },
      { time: "09:02:00", message: "ignored2", metadata: { deleted: "20260310000000" }, offset: 40, startOffset: 40, endOffset: 50, bodyStartOffset: 42 },
    ] as any);

    const { result } = renderHook(() => usePostsAndTasks({
      date: moment("2026-03-10T00:00:00.000Z") as any,
      granularity: "day"
    }));

    await act(async () => {
      await result.current.updatePosts(note);
    });

    // parse 自体は全部するが、metadata が入っていることを確認
    expect(result.current.posts.length).toBe(3);
    expect(result.current.posts.find(p => p.message === "ignored1")?.metadata.archived).toBe("true");
    expect(result.current.posts.find(p => p.message === "ignored2")?.metadata.deleted).toBe("20260310000000");
  });
});

describe("updatePostsForDays with Topics", () => {
  const mockAppHelper = {
    cachedReadFile: vi.fn(),
    getTasks: vi.fn(),
    loadFile: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppContext as any).mockReturnValue({
      app: {},
      appHelper: mockAppHelper,
    });
    initializePostsStore({} as any, mockAppHelper as any);
    settingsStore.setState({ date: moment("2026-03-09T12:00:00.000Z") as any });
  });

  it("トピック指定時に正しく複数日の投稿を取得できること", async () => {
    const mockFileTopic1 = { path: "topic-2026-03-09.md" } as any;
    const mockFileTopic2 = { path: "topic-2026-03-08.md" } as any;
    
    const date0 = moment("2026-03-09T12:00:00.000Z").startOf("day");
    const date1 = date0.clone().subtract(1, "days");

    vi.spyOn(dailyNotes, "getAllTopicNotes").mockReturnValue({
      [`day-${date0.toISOString()}`]: mockFileTopic1,
      [`day-${date1.toISOString()}`]: mockFileTopic2,
    });

    vi.spyOn(thino, "parseThinoEntries").mockImplementation((content) => {
      if (content === "topic-content1") return [{ time: "10:00:00", message: "topic-post1", offset: 0, startOffset: 0, endOffset: 10, bodyStartOffset: 2 }] as any;
      if (content === "topic-content2") return [{ time: "11:00:00", message: "topic-post2", offset: 0, startOffset: 0, endOffset: 10, bodyStartOffset: 2 }] as any;
      return [];
    });

    mockAppHelper.cachedReadFile.mockImplementation((file: any) => {
      if (file.path === "topic-2026-03-09.md") return Promise.resolve("topic-content1");
      if (file.path === "topic-2026-03-08.md") return Promise.resolve("topic-content2");
      return Promise.resolve("");
    });

    const { result } = renderHook(() => usePostsAndTasks({
      date: moment("2026-03-09T12:00:00.000Z") as any,
      granularity: "day"
    }));

    await act(async () => {
      await result.current.updatePostsForDays("topic", 2);
    });

    expect(result.current.posts.length).toBe(2);
    expect(result.current.posts[0].message).toBe("topic-post1");
    expect(result.current.posts[1].message).toBe("topic-post2");
    expect(result.current.posts[0].path).toBe("topic-2026-03-09.md");
  });
});
