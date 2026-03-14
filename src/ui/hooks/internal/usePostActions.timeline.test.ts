// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { useAppContext } from "src/ui/context/AppContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { editorStore } from "src/ui/store/editorStore";
import { noteStore } from "src/ui/store/noteStore";
import { postsStore } from "src/ui/store/postsStore";
import { settingsStore } from "src/ui/store/settingsStore";
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
  const todayNote = {
    path: "2026-03-15.md",
    basename: "2026-03-15",
    extension: "md",
  } as any;
  const yesterdayNote = {
    path: "2026-03-14.md",
    basename: "2026-03-14",
    extension: "md",
  } as any;
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
      vault: {},
    };

    (useAppContext as any).mockReturnValue({
      app: mockApp,
      appHelper: {
        insertTextAfter: mockInsertTextAfter,
        replaceRange: vi.fn(),
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
        },
      },
      scrollContainerRef: {
        current: {
          scrollTo: mockScrollTo,
        },
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
});
