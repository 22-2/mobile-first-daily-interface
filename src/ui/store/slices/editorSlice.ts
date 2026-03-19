import { STORAGE_KEYS } from "src/ui/config/consntants";
import { StateCreator } from "zustand/vanilla";
import { EditorSlice, MFDIStore } from "./types";

export const createEditorSlice: StateCreator<MFDIStore, [], [], EditorSlice> = (
  set,
  get,
) => ({
  input: "",
  editingPostOffset: null,
  inputRef: { current: null },
  scrollContainerRef: { current: null },

  setInput: (input) => {
    set({ input });
    get().storage?.set(STORAGE_KEYS.INPUT, input);
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
    const { date, granularity, setAsTask, setInput, storage } = get();
    setAsTask(false);
    set({ editingPostOffset: post.startOffset });
    storage?.set(STORAGE_KEYS.EDITING_POST_OFFSET, post.startOffset);
    storage?.set(STORAGE_KEYS.EDITING_POST_DATE, date.toISOString());
    storage?.set(STORAGE_KEYS.EDITING_POST_GRANULARITY, granularity);
    setInput(post.message);

    setTimeout(() => {
      get().inputRef.current?.setContent(post.message);
      get().inputRef.current?.focus();
    });
  },

  cancelEdit: () => {
    const { storage, setInput } = get();
    set({ editingPostOffset: null });
    storage?.remove(STORAGE_KEYS.EDITING_POST_OFFSET);
    storage?.remove(STORAGE_KEYS.EDITING_POST_DATE);
    storage?.remove(STORAGE_KEYS.EDITING_POST_GRANULARITY);
    setInput("");
    get().inputRef.current?.setContent("");
  },

  getEditingPost: (posts) => {
    const { editingPostOffset } = get();
    if (editingPostOffset === null) return null;
    return posts.find((post) => post.startOffset === editingPostOffset) ?? null;
  },

  canSubmit: (posts) => {
    const {
      input,
      granularity,
      getEffectiveDate,
      getEditingPost,
      isDateReadOnly,
    } = get();
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

    set({
      input: storage.get<string>(STORAGE_KEYS.INPUT, ""),
      editingPostOffset: storage.get<number | null>(
        STORAGE_KEYS.EDITING_POST_OFFSET,
        null,
      ),
    });
  },
});
