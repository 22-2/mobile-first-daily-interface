import { STORAGE_KEYS } from "src/ui/config/consntants";
import type { EditorSlice, MFDIStore } from "src/ui/store/slices/types";
import type { StateCreator } from "zustand/vanilla";

export const createEditorSlice: StateCreator<MFDIStore, [], [], EditorSlice> = (
  set,
  get,
) => {
  let inputPersistTimer: ReturnType<typeof setTimeout> | null = null;

  const persistInputDebounced = (input: string) => {
    if (inputPersistTimer !== null) {
      clearTimeout(inputPersistTimer);
    }

    inputPersistTimer = setTimeout(() => {
      get().storage?.set(STORAGE_KEYS.INPUT, input);
      inputPersistTimer = null;
    }, 300);
  };

  const persistInputImmediately = (input: string) => {
    if (inputPersistTimer !== null) {
      clearTimeout(inputPersistTimer);
      inputPersistTimer = null;
    }

    get().storage?.set(STORAGE_KEYS.INPUT, input);
  };

  const updateSessionInput = (
    input: string,
    options?: {
      updateEditor?: boolean;
      syncEditorIfStale?: boolean;
      persistMode?: "debounced" | "immediate";
    },
  ) => {
    set({ inputSnapshot: input });

    if (options?.persistMode === "immediate") {
      persistInputImmediately(input);
    } else {
      persistInputDebounced(input);
    }

    // ないとEditorの内容が同期されない
    const inputRef = get().inputRef.current;
    if (options?.updateEditor) {
      inputRef?.setContent(input);
      return;
    }

    if (options?.syncEditorIfStale && inputRef) {
      const editorSnapshot = inputRef.getContentSnapshot();
      if (editorSnapshot !== input) {
        inputRef.setContent(input);
      }
    }
    // ここまでないと、reactのstateは更新されるが、live editorの内容が更新されないため、両方を更新する必要がある
  };

  return {
    inputSnapshot: "",
    editingPostOffset: null,
    inputRef: { current: null },
    scrollContainerRef: { current: null },

    syncInputSession: (input) => {
      updateSessionInput(input, {
        persistMode: "debounced",
        syncEditorIfStale: true,
      });
    },

    replaceInput: (input) => {
      updateSessionInput(input, {
        updateEditor: true,
        persistMode: "immediate",
      });
    },

    clearInput: () => {
      updateSessionInput("", {
        updateEditor: true,
        persistMode: "immediate",
      });
    },

    getInputValue: () => {
      return get().inputSnapshot;
    },

    setEditingPostOffset: (editingPostOffset) => {
      set({ editingPostOffset });
      get().storage?.set(STORAGE_KEYS.EDITING_POST_OFFSET, editingPostOffset);
    },

    setInputRef: (inputRef) => {
      set({ inputRef });
    },

    setScrollContainerRef: (scrollContainerRef) => {
      set({ scrollContainerRef });
    },

    startEdit: (post) => {
      const { date, granularity, setAsTask, replaceInput, storage } = get();
      setAsTask(false);
      set({ editingPostOffset: post.startOffset });
      storage?.set(STORAGE_KEYS.EDITING_POST_OFFSET, post.startOffset);
      storage?.set(STORAGE_KEYS.EDITING_POST_DATE, date.toISOString());
      storage?.set(STORAGE_KEYS.EDITING_POST_GRANULARITY, granularity);
      replaceInput(post.message);

      setTimeout(() => {
        get().inputRef.current?.focus();
      });
    },

    cancelEdit: () => {
      const { storage, clearInput } = get();
      set({ editingPostOffset: null });
      storage?.remove(STORAGE_KEYS.EDITING_POST_OFFSET);
      storage?.remove(STORAGE_KEYS.EDITING_POST_DATE);
      storage?.remove(STORAGE_KEYS.EDITING_POST_GRANULARITY);
      clearInput();
    },

    getEditingPost: (posts) => {
      const { editingPostOffset } = get();
      if (editingPostOffset === null) return null;
      return (
        posts.find((post) => post.startOffset === editingPostOffset) ?? null
      );
    },

    canSubmit: (posts, currentValue) => {
      const {
        getInputValue,
        granularity,
        getEffectiveDate,
        getEditingPost,
        isDateReadOnly,
      } = get();
      const input = currentValue ?? getInputValue();
      const effectiveDate = getEffectiveDate();
      if (isDateReadOnly(effectiveDate, granularity)) return false;

      const editingPost = getEditingPost(posts);
      if (!editingPost) {
        return input.trim().length > 0;
      }

      return input !== editingPost.message;
    },

    hydrateEditorState: () => {
      const { storage } = get();
      if (!storage) return;

      const persistedInput = storage.get<string>(STORAGE_KEYS.INPUT, "");
      const persistedEditingOffset = storage.get<number | null>(
        STORAGE_KEYS.EDITING_POST_OFFSET,
        null,
      );

      set((state) => ({
        inputSnapshot:
          state.inputSnapshot.length > 0 ? state.inputSnapshot : persistedInput,
        editingPostOffset: state.editingPostOffset ?? persistedEditingOffset,
      }));
    },
  };
};
