// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { TFile } from "obsidian";
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
      displayMode: "timeline",
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
      displayMode: "focus",
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
    expect(mockInsertTextAfter.mock.calls[0][1]).toContain("[posted::");
    expect(mockRefreshPosts).toHaveBeenCalledWith(yesterdayNote.path);
  });

  it("スレッド作成では自動でスレッド表示へ切り替えない", async () => {
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
    expect(settingsStore.getState().threadFocusRootId).toBeNull();
    expect(mockReplaceRange.mock.calls[0][3]).toContain("    [mfdiId::");
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
      id: "reply-1",
      threadRootId: "root-1",
      timestamp: today.clone().hour(1),
      noteDate: yesterday.clone().startOf("day"),
      message: "reply",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "reply-1",
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
