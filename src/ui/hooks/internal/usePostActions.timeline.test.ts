// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { TFile } from "obsidian";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { editorStore } from "src/ui/store/editorStore";
import { noteStore } from "src/ui/store/noteStore";
import { postsStore } from "src/ui/store/postsStore";
import { settingsStore } from "src/ui/store/settingsStore";
import { THREAD_METADATA_KEYS } from "src/ui/utils/thread-utils";
import * as dailyNotes from "src/utils/daily-notes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRefreshPosts } from "./useRefreshPosts";

vi.mock("src/ui/context/AppContext", () => ({
  useAppContext: vi.fn(),
}));

vi.mock("src/utils/daily-notes", async () => {
  const actual = await vi.importActual<typeof import("src/utils/daily-notes")>(
    "src/utils/daily-notes",
  );
  return {
    ...actual,
    getTopicNote: vi.fn(),
    createTopicNote: vi.fn(),
  };
});

vi.mock("./useRefreshPosts", () => ({
  useRefreshPosts: vi.fn(),
}));

describe("timeline note resolution", () => {
  const today = window.moment("2026-03-15T09:00:00.000Z");
  const yesterday = today.clone().subtract(1, "day");
  const todayNote = Object.assign(new TFile(), {
    path: "2026-03-15.md",
    basename: "2026-03-15",
    extension: "md",
  }) as any;
  const yesterdayNote = Object.assign(new TFile(), {
    path: "2026-03-14.md",
    basename: "2026-03-14",
    extension: "md",
  }) as any;
  let mockApp: any;

  const mockInsertTextAfter = vi.fn();
  const mockOpenFile = vi.fn();
  const mockRefreshPosts = vi.fn();
  const mockCreateNoteWithInsertAfter = vi.fn();
  const mockSetContent = vi.fn();
  const mockScrollTo = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(today.toDate());
    vi.clearAllMocks();

    mockApp = {
      workspace: {
        getLeaf: vi.fn(() => ({ openFile: mockOpenFile })),
      },
      vault: {
        getAbstractFileByPath: vi.fn((path: string) =>
          path === todayNote.path
            ? todayNote
            : path === yesterdayNote.path
              ? yesterdayNote
            : null,
        ),
      },
    };

    (useAppContext as any).mockReturnValue({
      app: mockApp,
      appHelper: {
        insertTextAfter: mockInsertTextAfter,
        replaceRange: vi.fn(),
        loadFile: vi.fn(async () => ""),
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    (useRefreshPosts as any).mockReturnValue(mockRefreshPosts);

    settingsStore.setState({
      activeTopic: "",
      granularity: "day",
      date: yesterday.clone(),
      timeFilter: "all",
      dateFilter: "today",
      sidebarOpen: true,
      displayMode: DISPLAY_MODE.TIMELINE,
      asTask: false,
    });

    postsStore.setState({ posts: [], tasks: [] });

    editorStore.setState({
      input: "timeline post",
      editingPostOffset: null,
      inputRef: {
        current: {
          getValue: () => "timeline post",
          setContent: mockSetContent,
          focus: vi.fn(),
        },
      },
      scrollContainerRef: {
        current: {
          scrollTo: mockScrollTo,
        } as unknown as HTMLDivElement,
      },
    });

    noteStore.setState({
      currentDailyNote: yesterdayNote,
      createNoteWithInsertAfter: mockCreateNoteWithInsertAfter,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("タイムライン投稿では過去ノートを見ていても今日のノートを作成して投稿する", async () => {
    vi.mocked(dailyNotes.getTopicNote).mockReturnValue(null);
    mockCreateNoteWithInsertAfter.mockResolvedValue(todayNote);
    mockInsertTextAfter.mockResolvedValue(undefined);
    mockRefreshPosts.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateNoteWithInsertAfter).toHaveBeenCalledTimes(1);
    expect(
      mockCreateNoteWithInsertAfter.mock.calls[0][2].isSame(today, "day"),
    ).toBe(true);
    expect(mockInsertTextAfter).toHaveBeenCalledWith(
      todayNote,
      expect.stringContaining("timeline post"),
      "## Thino",
    );
    expect(mockRefreshPosts).toHaveBeenCalledWith(todayNote.path);
    expect(mockSetContent).toHaveBeenCalledWith("");
  });

  it("フェンスコードブロック投稿は thino 互換の改行位置で保存する", async () => {
    vi.mocked(dailyNotes.getTopicNote).mockImplementation((_app, date) =>
      date.isSame(today, "day") ? todayNote : null,
    );
    mockInsertTextAfter.mockResolvedValue(undefined);
    mockRefreshPosts.mockResolvedValue(undefined);

    editorStore.setState({
      input: "```\nconsole.log('hello')\n```",
      inputRef: {
        current: {
          getValue: () => "```\nconsole.log('hello')\n```",
          setContent: mockSetContent,
          focus: vi.fn(),
        },
      },
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockInsertTextAfter).toHaveBeenCalledWith(
      todayNote,
      [
        `- ${today.format("HH:mm:ss")}`,
        "    ```",
        "    console.log('hello')",
        "    ```",
        "",
      ].join("\n"),
      "## Thino",
    );
  });

  it("タイムラインで現在のノートを開くは常に今日のノートを開く", async () => {
    vi.mocked(dailyNotes.getTopicNote).mockImplementation((_app, date) =>
      date.isSame(today, "day") ? todayNote : null,
    );

    await noteStore.getState().handleClickOpenDailyNote(mockApp, {
      insertAfter: "## Thino",
    } as any);

    expect(mockCreateNoteWithInsertAfter).not.toHaveBeenCalled();
    expect(mockOpenFile).toHaveBeenCalledWith(todayNote);
  });

  it("タイムラインで今日のノートが無ければ作成してから開く", async () => {
    vi.mocked(dailyNotes.getTopicNote).mockReturnValue(null);
    mockCreateNoteWithInsertAfter.mockResolvedValue(todayNote);

    await noteStore.getState().handleClickOpenDailyNote(mockApp, {
      insertAfter: "## Thino",
    } as any);

    expect(mockCreateNoteWithInsertAfter).toHaveBeenCalledTimes(1);
    expect(
      mockCreateNoteWithInsertAfter.mock.calls[0][2].isSame(today, "day"),
    ).toBe(true);
    expect(mockOpenFile).toHaveBeenCalledWith(todayNote);
  });

  it("スレッド表示中の投稿は親ノートへ返信として保存する", async () => {
    const threadRoot = {
      id: "root-1",
      threadRootId: "root-1",
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "root-1",
        [THREAD_METADATA_KEYS.ROOT_ID]: "root-1",
      },
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    postsStore.setState({ posts: [threadRoot], tasks: [] });
    settingsStore.setState({
      threadFocusRootId: "root-1",
      displayMode: DISPLAY_MODE.FOCUS,
      date: today.clone(),
    });
    mockInsertTextAfter.mockResolvedValue(undefined);
    mockRefreshPosts.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockInsertTextAfter).toHaveBeenCalledWith(
      expect.objectContaining({ path: yesterdayNote.path }),
      expect.stringContaining("    [mfdiThreadRootId::root-1]"),
      "## Thino",
    );
    expect(mockInsertTextAfter.mock.calls[0][1]).toContain("- 23:59:59 timeline post");
    expect(mockInsertTextAfter.mock.calls[0][1]).not.toContain("[mfdiId::");
    expect(mockInsertTextAfter.mock.calls[0][1]).toContain("[posted::");
    expect(mockRefreshPosts).toHaveBeenCalledWith(yesterdayNote.path);
  });

  it("同日の親ノートへの返信は実時刻で保存する", async () => {
    const todayThreadRoot = {
      id: "root-today-1",
      threadRootId: "root-today-1",
      timestamp: today.clone().hour(8),
      noteDate: today.clone().startOf("day"),
      message: "parent",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "root-today-1",
        [THREAD_METADATA_KEYS.ROOT_ID]: "root-today-1",
      },
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: todayNote.path,
    } as any;

    postsStore.setState({ posts: [todayThreadRoot], tasks: [] });
    settingsStore.setState({
      threadFocusRootId: "root-today-1",
      displayMode: DISPLAY_MODE.FOCUS,
      date: today.clone(),
    });
    mockInsertTextAfter.mockResolvedValue(undefined);
    mockRefreshPosts.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockInsertTextAfter.mock.calls[0][1]).toContain(
      `- ${today.format("HH:mm:ss")} timeline post`,
    );
    expect(mockInsertTextAfter.mock.calls[0][1]).not.toContain("- 23:59:59 timeline post");
  });

  it("スレッド作成では自動でスレッド表示へ切り替える", async () => {
    const plainPost = {
      id: `${yesterdayNote.path}:0`,
      threadRootId: null,
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {},
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    const mockReplaceRange = vi.fn().mockResolvedValue(undefined);
    (useAppContext as any).mockReturnValue({
      app: mockApp,
      appHelper: {
        insertTextAfter: mockInsertTextAfter,
        replaceRange: mockReplaceRange,
        loadFile: vi.fn(async () => ""),
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });
    settingsStore.setState({ threadFocusRootId: null });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.createThread(plainPost);
    });

    expect(mockReplaceRange).toHaveBeenCalledOnce();
    expect(settingsStore.getState().displayMode).toBe(DISPLAY_MODE.FOCUS);
    // スレッド作成後は自動でそのスレッドに切り替わる（root id が設定される）
    const fid = settingsStore.getState().threadFocusRootId;
    expect(typeof fid).toBe("string");
    expect(fid).toMatch(/^[a-f0-9]{8}$/);
    expect(mockReplaceRange.mock.calls[0][3]).toContain("- 12:00:00 parent");
    expect(mockReplaceRange.mock.calls[0][3]).not.toContain("- 23:59:59 parent");
    // 置換されたテキストに実際の mfdiId が含まれていることを確認
    expect(mockReplaceRange.mock.calls[0][3]).toContain(`    [${THREAD_METADATA_KEYS.ID}::${fid}]`);
  });

  it("既存スレッドを表示するとフォーカス表示へ切り替わる", async () => {
    const threadRoot = {
      id: "root-1",
      threadRootId: "root-1",
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "root-1",
        [THREAD_METADATA_KEYS.ROOT_ID]: "root-1",
      },
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    settingsStore.setState({
      displayMode: DISPLAY_MODE.TIMELINE,
      threadFocusRootId: null,
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.createThread(threadRoot);
    });

    expect(settingsStore.getState().displayMode).toBe(DISPLAY_MODE.FOCUS);
    expect(settingsStore.getState().threadFocusRootId).toBe("root-1");
  });

  it("スレッド親を削除すると子もまとめて削除する", async () => {
    const rootPost = {
      id: "root-1",
      threadRootId: "root-1",
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "root-1",
        [THREAD_METADATA_KEYS.ROOT_ID]: "root-1",
      },
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;
    const replyPost = {
      id: `${yesterdayNote.path}:20`,
      threadRootId: "root-1",
      timestamp: today.clone().hour(1),
      noteDate: yesterday.clone().startOf("day"),
      message: "reply",
      metadata: {
        [THREAD_METADATA_KEYS.ROOT_ID]: "root-1",
        posted: today.toISOString(),
      },
      offset: 20,
      startOffset: 20,
      endOffset: 40,
      bodyStartOffset: 22,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    postsStore.setState({ posts: [replyPost, rootPost], tasks: [] });
    settingsStore.setState({ threadFocusRootId: "root-1" });

    const mockReplaceRange = vi.fn().mockResolvedValue(undefined);
    (useAppContext as any).mockReturnValue({
      app: mockApp,
      appHelper: {
        insertTextAfter: mockInsertTextAfter,
        replaceRange: mockReplaceRange,
        loadFile: vi.fn(async () => ""),
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.deletePost(rootPost);
    });

    expect(mockReplaceRange).toHaveBeenCalledTimes(2);
    expect(mockRefreshPosts).toHaveBeenCalledWith(yesterdayNote.path);
    expect(settingsStore.getState().threadFocusRootId).toBeNull();
  });
});
