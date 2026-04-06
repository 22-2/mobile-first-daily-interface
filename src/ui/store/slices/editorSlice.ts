import { STORAGE_KEYS } from "src/ui/config/consntants";
import type { EditorSlice, MFDIStore } from "src/ui/store/slices/types";
import type { StateCreator } from "zustand/vanilla";

// startEdit / cancelEdit で操作するストレージキーをまとめて管理
const EDITING_POST_STORAGE_KEYS = [
  STORAGE_KEYS.EDITING_POST_OFFSET,
  STORAGE_KEYS.EDITING_POST_DATE,
  STORAGE_KEYS.EDITING_POST_GRANULARITY,
  STORAGE_KEYS.EDITING_POST_ID,
  STORAGE_KEYS.EDITING_POST_PATH,
  STORAGE_KEYS.EDITING_POST_TIMESTAMP,
  STORAGE_KEYS.EDITING_POST_METADATA,
] as const;

type PersistMode = "debounced" | "immediate";

type UpdateSessionInputOptions = {
  updateEditor?: boolean;
  persistMode?: PersistMode;
};

// hydrateEditorState で永続化データから editing post を復元する
type PersistedEditingPost = {
  id: string;
  path: string;
  timestampStr: string;
  metadataStr: string;
  noteDateStr: string;
  offset: number;
  message: string;
};

const reconstructEditingPost = ({
  id,
  path,
  timestampStr,
  metadataStr,
  noteDateStr,
  offset,
  message,
}: PersistedEditingPost) => ({
  id,
  path,
  timestamp: window.moment(timestampStr),
  noteDate: window.moment(noteDateStr),
  metadata: JSON.parse(metadataStr),
  message,
  startOffset: offset,
  endOffset: offset + message.length, // 近似値
  offset,
  bodyStartOffset: offset, // 近似値
  kind: "thino" as const,
  threadRootId: null, // 必要に応じて解決される
});

export const createEditorSlice: StateCreator<MFDIStore, [], [], EditorSlice> = (
  set,
  get,
) => {
  let inputPersistTimer: ReturnType<typeof setTimeout> | null = null;

  const persistInput = (input: string, mode: PersistMode) => {
    if (inputPersistTimer !== null) {
      clearTimeout(inputPersistTimer);
      inputPersistTimer = null;
    }

    if (mode === "immediate") {
      get().storage?.set(STORAGE_KEYS.INPUT, input);
      return;
    }

    inputPersistTimer = setTimeout(() => {
      get().storage?.set(STORAGE_KEYS.INPUT, input);
      inputPersistTimer = null;
    }, 50);
  };

  const updateSessionInput = (
    input: string,
    options: UpdateSessionInputOptions = {},
  ) => {
    const { updateEditor, persistMode = "debounced" } = options;

    set({ inputSnapshot: input });
    persistInput(input, persistMode);

    // updateEditor: 外部から内容を差し替える場合のみ live editor を同期する。
    // エディタの onChange 由来（syncInputSession）では呼ばない。
    // エディタは既に最新値を持っており、setContent を呼び返すと
    // getContentSnapshot のタイミング差で onChange→setContent→onChange… の
    // 再帰サイクルが生じ、入力フリーズの原因になるため。
    if (updateEditor) {
      get().inputRef.current?.setContent(input);
    }
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

    getInputValue: () => get().inputSnapshot,

    setEditingPostOffset: (editingPostOffset) => {
      set({ editingPostOffset });
      get().storage?.set(STORAGE_KEYS.EDITING_POST_OFFSET, editingPostOffset);
    },

    setEditingPost: (post) => {
      set({ editingPost: post, editingPostOffset: post?.startOffset ?? null });
    },

    setInputRef: (inputRef) => set({ inputRef }),

    setScrollContainerRef: (scrollContainerRef) => set({ scrollContainerRef }),

    startEdit: (post) => {
      const { date, granularity, setAsTask, replaceInput, storage } = get();

      setAsTask(false);
      set({ editingPost: post, editingPostOffset: post.startOffset });

      storage?.set(STORAGE_KEYS.EDITING_POST_OFFSET, post.startOffset);
      storage?.set(STORAGE_KEYS.EDITING_POST_DATE, date.toISOString());
      storage?.set(STORAGE_KEYS.EDITING_POST_GRANULARITY, granularity);
      storage?.set(STORAGE_KEYS.EDITING_POST_ID, post.id);
      storage?.set(STORAGE_KEYS.EDITING_POST_PATH, post.path);
      storage?.set(
        STORAGE_KEYS.EDITING_POST_TIMESTAMP,
        post.timestamp.toISOString(),
      );
      storage?.set(
        STORAGE_KEYS.EDITING_POST_METADATA,
        JSON.stringify(post.metadata),
      );

      replaceInput(post.message);

      setTimeout(() => get().inputRef.current?.focus());
    },

    cancelEdit: () => {
      const { storage, clearInput } = get();

      set({ editingPost: null, editingPostOffset: null });
      EDITING_POST_STORAGE_KEYS.forEach((key) => storage?.remove(key));
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
      if (!editingPost) return input.trim().length > 0;

      return input !== editingPost.message;
    },

    hydrateEditorState: () => {
      const { storage, replaceInput } = get();
      if (!storage) return;

      const persistedInput = storage.get<string>(STORAGE_KEYS.INPUT, "");
      const persistedEditingOffset = storage.get<number | null>(
        STORAGE_KEYS.EDITING_POST_OFFSET,
        null,
      );

      const id = storage.get<string | null>(STORAGE_KEYS.EDITING_POST_ID, null);
      const path = storage.get<string | null>(
        STORAGE_KEYS.EDITING_POST_PATH,
        null,
      );
      const timestampStr = storage.get<string | null>(
        STORAGE_KEYS.EDITING_POST_TIMESTAMP,
        null,
      );
      const metadataStr = storage.get<string | null>(
        STORAGE_KEYS.EDITING_POST_METADATA,
        null,
      );
      const noteDateStr = storage.get<string | null>(
        STORAGE_KEYS.EDITING_POST_DATE,
        null,
      );

      const canReconstruct =
        id &&
        path &&
        timestampStr &&
        metadataStr &&
        noteDateStr &&
        persistedEditingOffset !== null;

      const reconstructedPost = canReconstruct
        ? reconstructEditingPost({
            id,
            path,
            timestampStr,
            metadataStr,
            noteDateStr,
            offset: persistedEditingOffset,
            message: persistedInput,
          })
        : null;

      set((state) => ({
        inputSnapshot: state.inputSnapshot || persistedInput,
        editingPostOffset: state.editingPostOffset ?? persistedEditingOffset,
        editingPost: state.editingPost ?? reconstructedPost,
      }));

      // ストレージから復元した内容で live editor も同期する
      // replaceInput を使い、エディタへ直接 setContent する（syncInputSession は
      // エディタ→ストアの片方向専用のため）
      setTimeout(() => replaceInput(persistedInput));
    },
  };
};
