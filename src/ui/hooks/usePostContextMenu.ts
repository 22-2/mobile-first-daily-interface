import { Menu, Notice } from "obsidian";
import { useCallback } from "react";
import { useMFDIContext } from "src/ui/context/MFDIAppContext";
import { Post } from "src/ui/types";

export const usePostContextMenu = () => {
  const {
    handleClickTime,
    setDate,
    setDisplayMode,
    startEdit,
    isReadOnly,
    movePostToTomorrow,
    deletePost,
  } = useMFDIContext();

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
