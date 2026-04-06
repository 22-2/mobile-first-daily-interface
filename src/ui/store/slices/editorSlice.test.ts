import type { MFDIStorage } from "src/core/storage";
import type { ObsidianLiveEditorRef } from "src/ui/components/editor/ObsidianLiveEditor";
import { STORAGE_KEYS } from "src/ui/config/consntants";
import { createAppStore } from "src/ui/store/appStore";
import type { Post } from "src/ui/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockStorageHandle = {
  storage: MFDIStorage;
  values: Map<string, unknown>;
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

type MockEditorHandle = {
  inputRef: { current: ObsidianLiveEditorRef | null };
  setContent: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
};

function createMockStorage(
  initialValues: Record<string, unknown> = {},
): MockStorageHandle {
  const values = new Map<string, unknown>(Object.entries(initialValues));

  const set = vi.fn(<T>(key: string, value: T) => {
    values.set(key, value);
  });
  const get = vi.fn(<T>(key: string, defaultValue: T): T => {
    return values.has(key) ? (values.get(key) as T) : defaultValue;
  });
  const remove = vi.fn((key: string) => {
    values.delete(key);
  });

  return {
    storage: {
      set,
      get,
      remove,
    } as unknown as MFDIStorage,
    values,
    set,
    get,
    remove,
  };
}

function createMockEditor(initialSnapshot = ""): MockEditorHandle {
  let contentSnapshot = initialSnapshot;
  const setContent = vi.fn((text: string) => {
    contentSnapshot = text;
  });
  const focus = vi.fn();

  return {
    inputRef: {
      current: {
        focus,
        getValue: () => contentSnapshot,
        getContentSnapshot: () => contentSnapshot,
        subscribeContent: () => () => {},
        setContent,
      },
    },
    setContent,
    focus,
  };
}

function buildPostFixture(message: string): Post {
  const noteDate = window.moment("2026-03-15T00:00:00.000Z");
  const timestamp = noteDate.clone().hour(12);

  return {
    id: "post-1",
    path: "Daily/2026-03-15.md",
    threadRootId: null,
    timestamp,
    noteDate,
    message,
    metadata: { tag: "debug" },
    offset: 42,
    startOffset: 42,
    endOffset: 42 + message.length,
    bodyStartOffset: 42,
    kind: "thino",
  };
}

describe("editorSlice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hydrateEditorState は保存済み入力を snapshot と editor に復元する", () => {
    const store = createAppStore();
    const persistedInput = "restored draft";
    const { storage, set: setStorage } = createMockStorage({
      [STORAGE_KEYS.INPUT]: persistedInput,
    });
    const { inputRef, setContent } = createMockEditor("");

    store.setState({
      storage,
      inputRef,
    });

    store.getState().hydrateEditorState();

    expect(store.getState().inputSnapshot).toBe(persistedInput);
    expect(store.getState().getInputValue()).toBe(persistedInput);
    expect(setContent).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(setContent).toHaveBeenCalledWith(persistedInput);
    expect(setStorage).toHaveBeenCalledWith(STORAGE_KEYS.INPUT, persistedInput);
  });

  it("hydrateEditorState は編集中投稿の復元情報も再構築する", () => {
    const store = createAppStore();
    const post = buildPostFixture("editing draft");
    const { storage } = createMockStorage({
      [STORAGE_KEYS.INPUT]: post.message,
      [STORAGE_KEYS.EDITING_POST_OFFSET]: post.startOffset,
      [STORAGE_KEYS.EDITING_POST_ID]: post.id,
      [STORAGE_KEYS.EDITING_POST_PATH]: post.path,
      [STORAGE_KEYS.EDITING_POST_TIMESTAMP]: post.timestamp.toISOString(),
      [STORAGE_KEYS.EDITING_POST_METADATA]: JSON.stringify(post.metadata),
      [STORAGE_KEYS.EDITING_POST_DATE]: post.noteDate.toISOString(),
    });

    store.setState({ storage });

    store.getState().hydrateEditorState();

    const restoredPost = store.getState().editingPost;
    expect(restoredPost).not.toBeNull();
    expect(restoredPost?.id).toBe(post.id);
    expect(restoredPost?.path).toBe(post.path);
    expect(restoredPost?.message).toBe(post.message);
    expect(restoredPost?.metadata).toEqual(post.metadata);
    expect(restoredPost?.timestamp.toISOString()).toBe(
      post.timestamp.toISOString(),
    );
    expect(restoredPost?.noteDate.toISOString()).toBe(
      post.noteDate.toISOString(),
    );
    expect(store.getState().editingPostOffset).toBe(post.startOffset);
  });
});
