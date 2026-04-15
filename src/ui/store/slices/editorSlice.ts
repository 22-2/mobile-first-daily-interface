import { INPUT_AREA_SIZE, STORAGE_KEYS } from "src/ui/config/consntants";
import { getInputStorageKey } from "src/ui/store/slices/inputStorage";
import type { EditorSlice, MFDIStore } from "src/ui/store/slices/types";
import type { StateCreator } from "zustand/vanilla";

type PersistMode = "debounced" | "immediate";

type UpdateSessionInputOptions = {
  updateEditor?: boolean;
  persistMode?: PersistMode;
};

// 編集中投稿のセッション情報を1オブジェクトにまとめて永続化する
// settingsSlice が granularity / noteDateStr を参照するため両フィールドを含む
export type PersistedEditingPost = {
  id: string;
  path: string;
  timestampStr: string;
  metadataStr: string;
  noteDateStr: string;
  offset: number;
  granularity: string;
};

const reconstructEditingPost = (
  persisted: PersistedEditingPost,
  message: string,
) => ({
  id: persisted.id,
  path: persisted.path,
  timestamp: window.moment(persisted.timestampStr),
  noteDate: window.moment(persisted.noteDateStr),
  metadata: JSON.parse(persisted.metadataStr),
  message,
  startOffset: persisted.offset,
  endOffset: persisted.offset + message.length, // 近似値
  offset: persisted.offset,
  bodyStartOffset: persisted.offset, // 近似値
  kind: "thino" as const,
  threadRootId: null, // 必要に応じて解決される
});

export const createEditorSlice: StateCreator<MFDIStore, [], [], EditorSlice> = (
  set,
  get,
) => {
  let inputPersistTimer: ReturnType<typeof setTimeout> | null = null;

  const persistInput = (input: string, mode: PersistMode) => {
    const { viewNoteMode, fixedNotePath } = get();
    const inputStorageKey = getInputStorageKey(viewNoteMode, fixedNotePath);

    if (inputPersistTimer !== null) {
      clearTimeout(inputPersistTimer);
      inputPersistTimer = null;
    }

    if (mode === "immediate") {
      get().storage?.set(inputStorageKey, input);
      return;
    }

    inputPersistTimer = setTimeout(() => {
      get().storage?.set(inputStorageKey, input);
      inputPersistTimer = null;
    }, 50);
  };

  const updateSessionInput = (
    input: string,
    options: UpdateSessionInputOptions = {},
  ) => {
    const { updateEditor, persistMode = "debounced" } = options;

    set((state) => ({
      inputSnapshot: input,
      ...(updateEditor
        ? { inputSnapshotVersion: state.inputSnapshotVersion + 1 }
        : {}),
    }));
    persistInput(input, persistMode);
  };

  return {
    inputSnapshot: "",
    inputSnapshotVersion: 0,
    editingPost: null,
    editingPostOffset: null,
    highlightedPost: null,
    highlightRequestId: 0,

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

    setEditingPost: (post) => {
      set({ editingPost: post, editingPostOffset: post?.startOffset ?? null });
    },

    setHighlightedPost: (post) => {
      set((state) => ({
        highlightedPost: post,
        highlightRequestId:
          post !== null
            ? state.highlightRequestId + 1
            : state.highlightRequestId,
      }));
    },

    clearHighlightedPost: () => {
      set({ highlightedPost: null });
    },

    startEdit: (post) => {
      const { date, granularity, setAsTask, setInputAreaSize, replaceInput, storage } = get();
      // 意図: 編集開始時に minimized だと入力欄が見えないので default に戻す。
      setInputAreaSize(INPUT_AREA_SIZE.DEFAULT);

      setAsTask(false);
      set({ editingPost: post, editingPostOffset: post.startOffset });

      // 編集セッション情報を1キーにまとめて保存する
      const persisted: PersistedEditingPost = {
        id: post.id,
        path: post.path,
        timestampStr: post.timestamp.toISOString(),
        metadataStr: JSON.stringify(post.metadata),
        noteDateStr: date.toISOString(),
        offset: post.startOffset,
        granularity,
      };
      storage?.set(STORAGE_KEYS.EDITING_POST, persisted);

      replaceInput(post.message);
    },

    cancelEdit: () => {
      const { storage, clearInput } = get();

      set({ editingPost: null, editingPostOffset: null });
      storage?.remove(STORAGE_KEYS.EDITING_POST);
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
      const { storage, viewNoteMode, fixedNotePath } = get();
      if (!storage) return;

      const persistedInput = storage.get<string>(
        getInputStorageKey(viewNoteMode, fixedNotePath),
        "",
      );

      const persisted = storage.get<PersistedEditingPost | null>(
        STORAGE_KEYS.EDITING_POST,
        null,
      );

      const reconstructedPost =
        persisted !== null
          ? reconstructEditingPost(persisted, persistedInput)
          : null;

      set((state) => ({
        inputSnapshot: state.inputSnapshot || persistedInput,
        inputSnapshotVersion: state.inputSnapshotVersion + 1,
        editingPostOffset: state.editingPostOffset ?? persisted?.offset ?? null,
        editingPost: state.editingPost ?? reconstructedPost,
      }));
    },
  };
};
