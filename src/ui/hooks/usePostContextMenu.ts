import { Menu, Notice } from "obsidian";
import { useCallback } from "react";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { Post } from "src/ui/types";
import { useShallow } from "zustand/shallow";
import { DISPLAY_MODE } from "../config/consntants";
import { isThreadReply, isThreadRoot } from "../utils/thread-utils";

export const usePostContextMenu = () => {
  const { setDate, setDisplayMode, isReadOnly } = useSettingsStore(
    useShallow((s) => ({
      setDate: s.setDate,
      setDisplayMode: s.setDisplayMode,
      isReadOnly: s.isReadOnly(),
    })),
  );

  const { startEdit } = useEditorStore(
    useShallow((s) => ({
      startEdit: s.startEdit,
    })),
  );

  const {
    handleClickTime,
    movePostToTomorrow,
    deletePost,
    archivePost,
    createThread,
  } = usePostActions();

  const showPostContextMenu = useCallback(
    (post: Post, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const menu = new Menu();

      // 実験的機能はサブメニューにまとめる（addItem のコールバック内でサブメニューを作成し、
      // その場で項目を追加するパターンに合わせる）
      menu.addItem((item) => {
        item.setTitle("実験的").setIcon("beaker");
        const sub = item.setSubmenu();

        sub.addItem((si) =>
          si
            .setTitle(isThreadRoot(post) ? "スレッドを表示" : "スレッドを作成")
            .setIcon("spool")
            .setDisabled(isReadOnly || isThreadReply(post))
            .onClick(() => {
              createThread(post);
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("この日にフォーカス")
            .setIcon("calendar-range")
            .onClick(() => {
              setDate(post.timestamp.clone());
              setDisplayMode(DISPLAY_MODE.FOCUS);
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("明日に送る")
            .setIcon("fast-forward")
            .setDisabled(isReadOnly)
            .onClick(() => {
              movePostToTomorrow(post);
            }),
        );
      });

      menu.addSeparator();

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

      menu.addSeparator();

      menu.addItem((item) =>
        item
          .setTitle("アーカイブ")
          .setIcon("archive")
          .setDisabled(isReadOnly)
          .onClick(() => {
            archivePost(post);
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
      archivePost,
    ],
  );

  return { showPostContextMenu };
};
