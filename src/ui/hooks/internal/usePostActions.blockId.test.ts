// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { TFile, Notice } from "obsidian";
import { useAppContext } from "src/ui/context/AppContext";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { postsStore } from "src/ui/store/postsStore";
import { settingsStore } from "src/ui/store/settingsStore";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock("src/ui/context/AppContext", () => ({
  useAppContext: vi.fn(),
}));

vi.mock("./refreshPosts", () => ({
  createRefreshPosts: vi.fn(() => vi.fn()),
}));

vi.mock("obsidian", async () => {
  const actual = await vi.importActual<typeof import("obsidian")>("obsidian");
  return {
    ...actual,
    Notice: vi.fn(),
  };
});

describe("usePostActions - copyBlockIdLink", () => {
  const today = window.moment("2026-03-15T10:00:00.000+09:00");
  const testNote = Object.assign(new TFile(), {
    path: "test-note.md",
    basename: "test-note",
    extension: "md",
  }) as any;

  let mockApp: any;
  let mockShell: any;

  beforeEach(() => {
    mockApp = {
      vault: {
        getAbstractFileByPath: vi.fn((path: string) => (path === testNote.path ? testNote : null)),
      },
      fileManager: {
        generateMarkdownLink: vi.fn((file, _path, subpath) => `[[${file.basename}${subpath}]]`),
      },
    };

    mockShell = {
      getVault: vi.fn(() => mockApp.vault),
      getRawApp: vi.fn(() => mockApp),
      loadFile: vi.fn(async () => ""),
      replaceRange: vi.fn().mockResolvedValue(undefined),
    };

    (useAppContext as any).mockReturnValue({
      shell: mockShell,
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    settingsStore.setState({
      granularity: "day",
    });

    postsStore.setState({ posts: [] });

    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("既存の blockId がある場合はそれを使用してコピーする", async () => {
    const postWithId = {
      id: "post-1",
      message: "hello",
      metadata: { blockId: "existing123" },
      path: testNote.path,
      timestamp: today,
      noteDate: today,
      startOffset: 0,
      endOffset: 10,
    } as any;

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.copyBlockIdLink(postWithId);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("[[test-note#^existing123]]");
    expect(Notice).toHaveBeenCalledWith("ブロックIDリンクをコピーしました");
    expect(mockShell.replaceRange).not.toHaveBeenCalled();
  });

  it("blockId がない場合は新しく生成して保存してからコピーする", async () => {
    // Force focus mode so that findLatestPost uses absolute offsets correctly
    settingsStore.setState({ displayMode: DISPLAY_MODE.FOCUS });
    const postWithoutId = {
      id: "post-2",
      message: "no id",
      metadata: {},
      path: testNote.path,
      timestamp: today,
      noteDate: today,
      startOffset: 0,
      endOffset: 5,
    } as any;

    mockShell.loadFile.mockResolvedValue("## Thino\n- 10:00:00 no id\n");

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.copyBlockIdLink(postWithoutId);
    });

    // Verify blockId was generated and saved
    expect(mockShell.replaceRange).toHaveBeenCalledOnce();
    const savedText = mockShell.replaceRange.mock.calls[0][3];
    expect(savedText).toMatch(/\^([0-9a-z]{6})/);

    const generatedId = savedText.match(/\^([0-9a-z]{6})/)[1];
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`[[test-note#^${generatedId}]]`);
    expect(Notice).toHaveBeenCalledWith("ブロックIDリンクをコピーしました");
  });
});
