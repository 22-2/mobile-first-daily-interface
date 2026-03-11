import { MarkdownView, Notice, TFile } from "obsidian";
import { useCallback } from "react";
import { useAppContext } from "src/ui/context/AppContext";
import { useEditorStore } from "src/ui/store/editorStore";
import { noteStore, useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { Post } from "src/ui/types";
import { toText } from "src/ui/utils/post-utils";
import { getTopicNote } from "src/utils/daily-notes";
import { useShallow } from "zustand/shallow";
import { useRefreshPosts } from "./useRefreshPosts";

export const usePostActions = () => {
  const { app, appHelper, settings } = useAppContext();
  const refreshPosts = useRefreshPosts();

  const settingsState = useSettingsStore(useShallow(s => ({
    date: s.date,
    granularity: s.granularity,
    activeTopic: s.activeTopic,
    dateFilter: s.dateFilter,
    asTask: s.asTask,
    setDate: s.setDate,
    isReadOnly: s.isReadOnly(),
    displayMode: s.displayMode,
  })));


  const postsState = usePostsStore(useShallow(s => ({
    posts: s.posts,
    updatePosts: s.updatePosts,
    updatePostsForWeek: s.updatePostsForWeek,
    updatePostsForDays: s.updatePostsForDays,
  })));

  const editorState = useEditorStore(useShallow(s => ({
    input: s.input,
    setInput: s.setInput,
    inputRef: s.inputRef,
    scrollContainerRef: s.scrollContainerRef,
    editingPost: s.getEditingPost(postsState.posts),
    canSubmit: s.canSubmit(postsState.posts),
    cancelEdit: s.cancelEdit,
  })));

  const noteState = useNoteStore(useShallow(s => ({
    currentDailyNote: s.currentDailyNote,
    replacePaths: s.replacePaths,
  })));

  // ---------------------------------------------------------------------------
  // 共通ヘルパー: 投稿を上書きして画面を更新する（削除・アーカイブ共通）
  // ---------------------------------------------------------------------------
  const replaceAndRefresh = useCallback(async (
    post: Post,
    extraMetadata: Record<string, string>,
  ) => {

    const metadata = {
      ...post.metadata,
      ...extraMetadata,
    };
    const text = toText(post.message, false, settingsState.granularity, post.timestamp, metadata);

    await appHelper.replaceRange(post.path, post.startOffset, post.endOffset, text);

    if (
      editorState.editingPost?.startOffset === post.startOffset &&
      editorState.editingPost?.path === post.path
    ) {
      editorState.cancelEdit();
    }

    await refreshPosts(post.path);
  }, [appHelper, settingsState.granularity, editorState, refreshPosts]);

  // ---------------------------------------------------------------------------
  // 新規投稿 / 編集の確定
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    if (!editorState.canSubmit) return;

    const currentInput = editorState.inputRef.current?.getValue() ?? editorState.input;

    // --- 編集中の投稿を上書き ---
    if (editorState.editingPost?.path) {
      const { editingPost } = editorState;
      const now = window.moment();

      let targetTs = editingPost.timestamp;
      if (settings.updateDateStrategy === "always") {
        targetTs = now;
      } else if (
        settings.updateDateStrategy === "same_day" &&
        editingPost.timestamp.isSame(now, "day")
      ) {
        targetTs = now;
      }

      const text = toText(currentInput, false, settingsState.granularity, targetTs, editingPost.metadata);
      await appHelper.replaceRange(editingPost.path, editingPost.startOffset, editingPost.endOffset, text);
      editorState.cancelEdit();
      await refreshPosts(editingPost.path);
      return;
    }

    // --- 新規投稿 ---
    const now = window.moment();
    const metadata: Record<string, string> = {};
    if (!settingsState.date.isSame(now, "day")) {
      metadata.posted = now.toISOString();
    }

    const text = toText(currentInput, settingsState.asTask, settingsState.granularity, undefined, metadata);
    if (!text) {
      editorState.setInput("");
      editorState.inputRef.current?.setContent("");
      return;
    }

    if (!noteState.currentDailyNote) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      await noteStore.getState().createNoteWithInsertAfter(app, settings, undefined);

      if (settingsState.dateFilter !== "today") {
        await refreshPosts();
      }

      settingsState.setDate(settingsState.date.clone());
    }

    const note = getTopicNote(app, settingsState.date, settingsState.granularity, settingsState.activeTopic);
    if (note) {
      await appHelper.insertTextAfter(note, `\n${text}`, settings.insertAfter);
      await refreshPosts(note.path);
    }

    editorState.setInput("");
    editorState.inputRef.current?.setContent("");
    editorState.scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [app, appHelper, settings, settingsState, postsState, editorState, noteState, refreshPosts]);

  // ---------------------------------------------------------------------------
  // 投稿を削除（削除フラグを付与して上書き）
  // ---------------------------------------------------------------------------
  const deletePost = useCallback(async (post: Post) => {
    const now = window.moment();
    await replaceAndRefresh(post, { deleted: now.format("YYYYMMDDHHmmss") });
  }, [replaceAndRefresh]);

  // ---------------------------------------------------------------------------
  // 投稿をアーカイブ（アーカイブフラグを付与して上書き）
  // ---------------------------------------------------------------------------
  const archivePost = useCallback(async (post: Post) => {
    const now = window.moment();
    await replaceAndRefresh(post, { archived: now.format("YYYYMMDDHHmmss") });
  }, [replaceAndRefresh]);

  // ---------------------------------------------------------------------------
  // 投稿を翌日へ移動
  // ---------------------------------------------------------------------------
  const movePostToTomorrow = useCallback(async (post: Post) => {
    if (settingsState.isReadOnly) {
      new Notice("過去のノートの投稿は移動できません");
      return;
    }

    const nextDay = post.timestamp.clone().add(1, "day");
    const nextNote = await noteStore.getState().createNoteWithInsertAfter(app, settings, nextDay);
    if (!nextNote) {
      new Notice("明日のノートが見つかりませんでした");
      return;
    }

    const now = window.moment();
    const metadata = { ...post.metadata };
    if (!nextDay.isSame(now, "day")) metadata.posted = now.toISOString();

    const messageWithFrom = `${post.message} (from ${post.timestamp.format("YYYY-MM-DD")})`;
    const text = toText(messageWithFrom, false, settingsState.granularity, nextDay, metadata);

    await appHelper.insertTextAfter(nextNote, `\n${text}`, settings.insertAfter);
    await deletePost(post);

    new Notice("明日に送りました");
  }, [app, appHelper, settings, settingsState, deletePost]);

  // ---------------------------------------------------------------------------
  // 投稿をクリックしてエディタで該当箇所をハイライト
  // ---------------------------------------------------------------------------
  const handleClickTime = useCallback((post: Post) => {
    (async () => {
      const noteFile = app.vault.getAbstractFileByPath(post.path);
      if (!(noteFile instanceof TFile)) return;

      const leaf = app.workspace.getLeaf(true);
      await app.workspace.revealLeaf(leaf);
      await leaf.openFile(noteFile, { active: true });

      const editor = app.workspace.activeEditor as MarkdownView;
      const startPos = editor.editor!.offsetToPos(post.bodyStartOffset);
      const endPos = editor.editor!.offsetToPos(post.bodyStartOffset + post.message.length);

      queueMicrotask(() => {
        editor.editMode!.highlightSearchMatches([{
          from: { line: startPos.line, ch: startPos.ch },
          to:   { line: endPos.line,   ch: endPos.ch   },
        }]);
      });
    })();
  }, [app.vault, app.workspace]);

  return {
    handleSubmit,
    deletePost,
    archivePost,
    movePostToTomorrow,
    handleClickTime,
  };
};
