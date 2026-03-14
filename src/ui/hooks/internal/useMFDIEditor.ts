import { useEditorStore } from "src/ui/store/editorStore";
import { Post } from "src/ui/types";
import { useShallow } from "zustand/shallow";

/**
 * 投稿・編集の入力状態を管理するHook。
 */
export function useMFDIEditor({ posts }: { posts: Post[] }) {
  const state = useEditorStore(
    useShallow((s) => ({
      input: s.input,
      setInput: s.setInput,
      editingPostOffset: s.editingPostOffset,
      setEditingPostOffset: s.setEditingPostOffset,
      inputRef: s.inputRef,
      startEdit: s.startEdit,
      cancelEdit: s.cancelEdit,
      canSubmit: s.canSubmit(posts),
      editingPost: s.getEditingPost(posts),
    })),
  );

  return state;
}
