import { type FC, memo } from "react";
import { useShallow } from "node_modules/zustand/esm/shallow.mjs";
import { useAppContext } from "src/ui/context/AppContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { useAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { FULL_EXPANSION_STYLE, DEFAULT_EXPANSION_STYLE } from "src/ui/components/inputarea/constants";
import { HStack, Button } from "src/ui/components/primitives";

export const InputAreaFooter: FC = memo(() => {
  const { posts } = useUnifiedPosts();

  const { settings } = useAppContext();

  const { asTask, isReadOnly, expanded } = useSettingsStore(
    useShallow((s) => ({
      asTask: s.asTask,
      isReadOnly: s.isReadOnly(),
      expanded: s.expanded,
    }))
  );

  const { canSubmit, cancelEdit } = useEditorStore(
    useShallow((s) => ({
      canSubmit: s.canSubmit(posts),
      cancelEdit: s.cancelEdit,
    }))
  );

  const { editingPost, inputSnapshot, clearInput } = useEditorStore(
    useShallow((s) => ({
      editingPost: s.editingPost,
      inputSnapshot: s.inputSnapshot,
      clearInput: s.clearInput,
    }))
  );

  const { addDraft } = useAppStore(
    useShallow((s) => ({
      addDraft: s.addDraft,
    }))
  );

  // const handleCreateDraft = useCallback(
  //   (e: React.MouseEvent) => {
  //     e.preventDefault();
  //     if (!inputSnapshot.trim()) return;
  //     addDraft(inputSnapshot);
  //     clearInput();
  //   },
  //   [addDraft, inputSnapshot, clearInput],
  // );
  const { handleSubmit } = usePostActions();

  return (
    <HStack className="justify-end items-center py-[0.5em] pb-[1em] mr-[1.2em]">
      {expanded && (
        <style>
          {settings.editorExpansionMode === "full" ? FULL_EXPANSION_STYLE : DEFAULT_EXPANSION_STYLE}
        </style>
      )}
      {editingPost && (
        <Button className="h-[2.4em]" variant="ghost" onClick={cancelEdit}>
          キャンセル
        </Button>
      )}
      {/* {!isReadOnly && !editingPost && (
              <Button
                className="h-[2.4em]"
                variant="ghost"
                disabled={!inputSnapshot.trim()}
                onClick={handleCreateDraft}
              >
                下書きに追加
              </Button>
            )} */}
      <Button
        disabled={!canSubmit}
        className="h-[2.4em]"
        variant="accent"
        onClick={handleSubmit}
      >
        {isReadOnly
          ? "閲覧モード"
          : editingPost
            ? "更新"
            : asTask
              ? "タスク追加"
              : "投稿"}
      </Button>
    </HStack>
  );
});
