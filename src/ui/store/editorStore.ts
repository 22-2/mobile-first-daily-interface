import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { RefObject } from "react";
import { ObsidianLiveEditorRef } from "src/ui/components/common/ObsidianLiveEditor";
import { Post, MomentLike, Granularity } from "src/ui/types";
import { MFDIStorage } from "src/utils/storage";
import { granularityConfig } from "src/ui/config/granularity-config";
import { settingsStore } from "./settingsStore";

interface EditorState {
  input: string;
  editingPostOffset: number | null;
  inputRef: RefObject<ObsidianLiveEditorRef | null>;
  
  // Actions
  setInput: (v: string) => void;
  setEditingPostOffset: (offset: number | null) => void;
  setInputRef: (ref: RefObject<ObsidianLiveEditorRef | null>) => void;
  
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

  setInput: (v) => {
    set({ input: v });
    if (_storage) {
      _storage.set("input", v);
    }
  },

  setEditingPostOffset: (offset) => {
    set({ editingPostOffset: offset });
    if (_storage) {
      _storage.set("editingPostOffset", offset);
    }
  },

  setInputRef: (ref) => {
    set({ inputRef: ref });
  },

  startEdit: (post) => {
    const { date, granularity, setAsTask } = settingsStore.getState();
    setAsTask(false);
    set({ editingPostOffset: post.startOffset });
    if (_storage) {
      _storage.set("editingPostOffset", post.startOffset);
      _storage.set("editingPostDate", date.toISOString());
      _storage.set("editingPostGranularity", granularity);
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
      _storage.remove("editingPostOffset");
      _storage.remove("editingPostDate");
      _storage.remove("editingPostGranularity");
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
    const isPast = date.isBefore(window.moment(), granularityConfig[granularity].unit);
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
    input: storage.get<string>("input", ""),
    editingPostOffset: storage.get<number | null>("editingPostOffset", null),
  });
}

export function useEditorStore<T>(selector: (state: EditorState) => T): T {
  return useStore(editorStore, selector);
}
