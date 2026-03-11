import { Menu, Notice } from "obsidian";
import { useCallback } from "react";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useShallow } from "zustand/shallow";
import { Post } from "src/ui/types";

export const usePostContextMenu = () => {
  const { setDate, setDisplayMode, isReadOnly } = useSettingsStore(
    useShallow((s) => ({
      setDate: s.setDate,
      setDisplayMode: s.setDisplayMode,
      isReadOnly: s.isReadOnly(),
    }))
  );

  const { startEdit } = useEditorStore(
    useShallow((s) => ({
      startEdit: s.startEdit,
    }))
  );

  const { handleClickTime, movePostToTomorrow, deletePost } = usePostActions();

  const showPostContextMenu = useCallback(
    (post: Post, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const menu = new Menu();

      menu.addItem((item) =>
        item
          .setTitle("投稿にジャンプ")
          .setIcon("clock")
          .onClick(() => {
            handleClickTime(post);
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("この日にフォーカス")
          .setIcon("calendar-range")
          .onClick(() => {
            setDate(post.timestamp.clone());
            setDisplayMode("focus");
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("編集")
          .setIcon("pencil")
          .setDisabled(isReadOnly)
          .onClick(() => {
            startEdit(post);
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("コピー")
          .setIcon("copy")
          .onClick(async () => {
            await navigator.clipboard.writeText(post.message);
            new Notice("copied");
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("明日に送る")
          .setIcon("fast-forward")
          .setDisabled(isReadOnly)
          .onClick(() => {
            movePostToTomorrow(post);
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("削除")
          .setIcon("trash")
          .setWarning(true)
          .setDisabled(isReadOnly)
          .onClick(() => {
            deletePost(post);
          }),
      );

      menu.showAtMouseEvent(e as unknown as MouseEvent);
    },
    [
      handleClickTime,
      setDate,
      setDisplayMode,
      startEdit,
      isReadOnly,
      movePostToTomorrow,
      deletePost,
    ],
  );

  return { showPostContextMenu };
};
