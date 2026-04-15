import { useShallow } from "zustand/shallow";
import { Menu } from "obsidian";
import { memo, type FC } from "react";
import {
  DEFAULT_EXPANSION_STYLE,
  FULL_EXPANSION_STYLE,
} from "src/ui/components/inputarea/constants";
import { Button, HStack } from "src/ui/components/primitives";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { useAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { INPUT_AREA_SIZE } from "src/ui/config/consntants";
import { useSettingsStore } from "src/ui/store/settingsStore";

export const InputAreaFooter: FC = memo(() => {
  const { posts } = useUnifiedPosts();

  const { asTask, isReadOnly, inputAreaSize, editorExpansionMode } =
    useSettingsStore(
      useShallow((s) => ({
        asTask: s.asTask,
        isReadOnly: s.isReadOnly(),
        inputAreaSize: s.inputAreaSize,
        editorExpansionMode: s.pluginSettings?.editorExpansionMode ?? "default",
      })),
    );
  const isMaximized = inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED;

  const { canSubmit, cancelEdit } = useEditorStore(
    useShallow((s) => ({
      canSubmit: s.canSubmit(posts),
      cancelEdit: s.cancelEdit,
    })),
  );

  const { editingPost, inputSnapshot, clearInput } = useEditorStore(
    useShallow((s) => ({
      editingPost: s.editingPost,
      inputSnapshot: s.inputSnapshot,
      clearInput: s.clearInput,
    })),
  );

  const { addDraft } = useAppStore(
    useShallow((s) => ({
      addDraft: s.addDraft,
    })),
  );

  const { handleSubmit } = usePostActions();

  return (
    <HStack className="mfdi-input-area-footer justify-end items-center py-[0.5em] pb-[1em] mr-[1.2em] gap-[0.5em]">
      {isMaximized && (
        <style>
          {editorExpansionMode === "full"
            ? FULL_EXPANSION_STYLE
            : DEFAULT_EXPANSION_STYLE}
        </style>
      )}
      {editingPost && (
        <Button className="h-[2.4em]" variant="ghost" onClick={cancelEdit}>
          キャンセル
        </Button>
      )}
      <Button
        disabled={!canSubmit}
        className="h-[2.4em]"
        variant="accent"
        onClick={handleSubmit}
        onContextMenu={(e) => {
          const menu = new Menu();
          menu.addItem((item) => {
            item
              .setTitle("下書きに追加")
              .setIcon("square-pen")
              .setDisabled(!inputSnapshot.trim())
              .onClick(() => {
                if (!inputSnapshot.trim()) return;
                addDraft(inputSnapshot);
                clearInput();
              });
          });
          menu.addItem((item) => {
            item
              .setTitle("クリア")
              .setIcon("delete")
              .setDisabled(!inputSnapshot)
              .onClick(() => {
                clearInput();
              });
          });
          menu.showAtMouseEvent(e.nativeEvent);
        }}
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
