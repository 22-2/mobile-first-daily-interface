import { RefObject } from "react";
import { ObsidianLiveEditorRef } from "src/ui/components/common/ObsidianLiveEditor";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { Post } from "src/ui/types";
import { MFDIStorage } from "src/utils/storage";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { settingsStore } from "src/ui/store/settingsStore";
import { STORAGE_KEYS } from "src/ui/config/consntants";

interface EditorState {
  input: string;
  editingPostOffset: number | null;
  inputRef: RefObject<ObsidianLiveEditorRef | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  
  // Actions
  setInput: (v: string) => void;
  setEditingPostOffset: (offset: number | null) => void;
  setInputRef: (ref: RefObject<ObsidianLiveEditorRef | null>) => void;
  setScrollContainerRef: (ref: RefObject<HTMLDivElement | null>) => void;
  
  // Complex Actions
  startEdit: (post: Post) => void;
  cancelEdit: () => void;
  
  // Helpers
  getEditingPost: (posts: Post[]) => Post | null;
  canSubmit: (posts: Post[]) => boolean;
}

let _storage: MFDIStorage | null = null;

export const editorStore = createStore<EditorState>((set, get) => ({
  input: "",
  editingPostOffset: null,
  inputRef: { current: null },
  scrollContainerRef: { current: null },

  setInput: (v) => {
    set({ input: v });
    if (_storage) {
      _storage.set(STORAGE_KEYS.INPUT, v);
    }
  },

  setEditingPostOffset: (offset) => {
    set({ editingPostOffset: offset });
    if (_storage) {
      _storage.set(STORAGE_KEYS.EDITING_POST_OFFSET, offset);
    }
  },

  setInputRef: (ref) => {
    set({ inputRef: ref });
  },

  setScrollContainerRef: (ref) => {
    set({ scrollContainerRef: ref });
  },

  startEdit: (post) => {
    const { date, granularity, setAsTask } = settingsStore.getState();
    setAsTask(false);
    set({ editingPostOffset: post.startOffset });
    if (_storage) {
      _storage.set(STORAGE_KEYS.EDITING_POST_OFFSET, post.startOffset);
      _storage.set(STORAGE_KEYS.EDITING_POST_DATE, date.toISOString());
      _storage.set(STORAGE_KEYS.EDITING_POST_GRANULARITY, granularity);
    }
    get().setInput(post.message);
    setTimeout(() => {
      get().inputRef.current?.setContent(post.message);
      get().inputRef.current?.focus();
    });
  },

  cancelEdit: () => {
    set({ editingPostOffset: null });
    if (_storage) {
      _storage.remove(STORAGE_KEYS.EDITING_POST_OFFSET);
      _storage.remove(STORAGE_KEYS.EDITING_POST_DATE);
      _storage.remove(STORAGE_KEYS.EDITING_POST_GRANULARITY);
    }
    get().setInput("");
    get().inputRef.current?.setContent("");
  },

  getEditingPost: (posts) => {
    const { editingPostOffset } = get();
    if (editingPostOffset === null) return null;
    return posts.find((p) => p.startOffset === editingPostOffset) ?? null;
  },

  canSubmit: (posts) => {
    const { input } = get();
    const { date, granularity } = settingsStore.getState();
    const isPast = date.isBefore(window.moment(), GRANULARITY_CONFIG[granularity].unit);
    if (isPast) return false;

    const editingPost = get().getEditingPost(posts);
    if (!editingPost) {
      return input.trim().length > 0;
    }
    return input !== editingPost.message;
  },
}));

export function initializeEditorStore(storage: MFDIStorage) {
  _storage = storage;
  editorStore.setState({
    input: storage.get<string>(STORAGE_KEYS.INPUT, ""),
    editingPostOffset: storage.get<number | null>(STORAGE_KEYS.EDITING_POST_OFFSET, null),
  });
}

export function useEditorStore<T>(selector: (state: EditorState) => T): T {
  return useStore(editorStore, selector);
}
