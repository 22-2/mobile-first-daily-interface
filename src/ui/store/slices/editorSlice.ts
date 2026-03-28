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
    }, 50);
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
    editingPost: null,
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

    setEditingPost: (post) => {
      set({ editingPost: post, editingPostOffset: post?.startOffset ?? null });
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
      set({ editingPost: post, editingPostOffset: post.startOffset });
      storage?.set(STORAGE_KEYS.EDITING_POST_OFFSET, post.startOffset);
      storage?.set(STORAGE_KEYS.EDITING_POST_DATE, date.toISOString());
      storage?.set(STORAGE_KEYS.EDITING_POST_GRANULARITY, granularity);

      storage?.set(STORAGE_KEYS.EDITING_POST_ID, post.id);
      storage?.set(STORAGE_KEYS.EDITING_POST_PATH, post.path);
      storage?.set(STORAGE_KEYS.EDITING_POST_TIMESTAMP, post.timestamp.toISOString());
      storage?.set(STORAGE_KEYS.EDITING_POST_METADATA, JSON.stringify(post.metadata));

      replaceInput(post.message);

      setTimeout(() => {
        get().inputRef.current?.focus();
      });
    },

    cancelEdit: () => {
      const { storage, clearInput } = get();
      set({ editingPost: null, editingPostOffset: null });
      storage?.remove(STORAGE_KEYS.EDITING_POST_OFFSET);
      storage?.remove(STORAGE_KEYS.EDITING_POST_DATE);
      storage?.remove(STORAGE_KEYS.EDITING_POST_GRANULARITY);
      storage?.remove(STORAGE_KEYS.EDITING_POST_ID);
      storage?.remove(STORAGE_KEYS.EDITING_POST_PATH);
      storage?.remove(STORAGE_KEYS.EDITING_POST_TIMESTAMP);
      storage?.remove(STORAGE_KEYS.EDITING_POST_METADATA);
      clearInput();
    },

    getEditingPost: (posts) => {
      const { editingPost, editingPostOffset } = get();
      if (editingPost) return editingPost;
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
      const { storage, syncInputSession } = get();
      if (!storage) return;

      const persistedInput = storage.get<string>(STORAGE_KEYS.INPUT, "");
      const persistedEditingOffset = storage.get<number | null>(
        STORAGE_KEYS.EDITING_POST_OFFSET,
        null,
      );

      const id = storage.get<string | null>(STORAGE_KEYS.EDITING_POST_ID, null);
      const path = storage.get<string | null>(STORAGE_KEYS.EDITING_POST_PATH, null);
      const timestampStr = storage.get<string | null>(STORAGE_KEYS.EDITING_POST_TIMESTAMP, null);
      const metadataStr = storage.get<string | null>(STORAGE_KEYS.EDITING_POST_METADATA, null);
      const noteDateStr = storage.get<string | null>(STORAGE_KEYS.EDITING_POST_DATE, null);

      let reconstructedPost = null;
      if (id && path && timestampStr && metadataStr && noteDateStr && persistedEditingOffset !== null) {
        reconstructedPost = {
          id,
          path,
          timestamp: window.moment(timestampStr),
          noteDate: window.moment(noteDateStr),
          metadata: JSON.parse(metadataStr),
          message: persistedInput,
          startOffset: persistedEditingOffset,
          endOffset: persistedEditingOffset + persistedInput.length, // approximation
          offset: persistedEditingOffset,
          bodyStartOffset: persistedEditingOffset, // approximation
          kind: "thino" as const,
          threadRootId: null, // will be resolved if needed
        };
      }

      set((state) => ({
        inputSnapshot:
          state.inputSnapshot.length > 0 ? state.inputSnapshot : persistedInput,
        editingPostOffset: state.editingPostOffset ?? persistedEditingOffset,
        editingPost: state.editingPost ?? reconstructedPost,
      }));

      // ストレージから復元した内容でセッションを同期する。これもないと、reactのstateは復元されるが、live editorの内容が復元されないため、両方を更新する必要がある
      setTimeout(() => syncInputSession(persistedInput))
    },
  };
};
