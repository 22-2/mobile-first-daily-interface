import { Notice, TFile } from "obsidian";
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

export const usePostActions = () => {
  const { app, appHelper, settings } = useAppContext();

  const settingsState = useSettingsStore(useShallow(s => ({
    date: s.date,
    granularity: s.granularity,
    activeTopic: s.activeTopic,
    dateFilter: s.dateFilter,
    asTask: s.asTask,
    setDate: s.setDate,
    isReadOnly: s.isReadOnly(),
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

  const handleSubmit = useCallback(async () => {
    if (!editorState.canSubmit) return;
    const currentInput = editorState.inputRef.current?.getValue() ?? editorState.input;

    if (editorState.editingPost) {
      const { editingPost } = editorState;
      if (editingPost.path) {
        const path = editingPost.path;
        let targetTs = editingPost.timestamp;
        const now = window.moment();
        if (settings.updateDateStrategy === "always") {
          targetTs = now;
        } else if (settings.updateDateStrategy === "same_day") {
          if (editingPost.timestamp.isSame(now, "day")) {
            targetTs = now;
          }
        }
        const text = toText(currentInput, false, settingsState.granularity, targetTs, editingPost.metadata);
        await appHelper.replaceRange(path, editingPost.startOffset, editingPost.endOffset, text);
        editorState.cancelEdit();
        
        const noteFile = app.vault.getAbstractFileByPath(path);
        if (noteFile instanceof TFile) {
          if (settingsState.dateFilter === "today") {
            await postsState.updatePosts(noteFile);
          } else if (settingsState.dateFilter === "this_week") {
            await postsState.updatePostsForWeek(settingsState.activeTopic, settingsState.date);
          } else {
            const days = parseInt(settingsState.dateFilter);
            if (!isNaN(days)) await postsState.updatePostsForDays(settingsState.activeTopic, settingsState.date, days);
          }
        }
        return;
      }
    }

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
        const updateFn = settingsState.dateFilter === "this_week"
          ? () => postsState.updatePostsForWeek(settingsState.activeTopic, settingsState.date)
          : () => postsState.updatePostsForDays(settingsState.activeTopic, settingsState.date, parseInt(settingsState.dateFilter)).then(res => res.paths);
        updateFn().then(paths => noteState.replacePaths(paths));
      }
      settingsState.setDate(settingsState.date.clone());
    }
    const note = getTopicNote(app, settingsState.date, settingsState.granularity, settingsState.activeTopic);
    if (note) {
      await appHelper.insertTextAfter(note, `\n${text}`, settings.insertAfter);
    }
    editorState.setInput("");
    editorState.inputRef.current?.setContent("");
    editorState.scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [app, appHelper, settings, settingsState, postsState, editorState, noteState]);

  const deletePost = useCallback(async (post: Post) => {
    const path = post.path;
    const targetTs = post.timestamp;
    const now = window.moment();
    const metadata = { ...post.metadata, deleted: now.format("YYYYMMDDHHmmss") };
    const text = toText(post.message, false, settingsState.granularity, targetTs, metadata);

    await appHelper.replaceRange(path, post.startOffset, post.endOffset, text);
    if (editorState.editingPost?.startOffset === post.startOffset && editorState.editingPost?.path === post.path) {
      editorState.cancelEdit();
    }

    if (settingsState.dateFilter === "today") {
      const noteFile = app.vault.getAbstractFileByPath(path);
      if (noteFile instanceof TFile) await postsState.updatePosts(noteFile);
    } else if (settingsState.dateFilter === "this_week") {
      await postsState.updatePostsForWeek(settingsState.activeTopic, settingsState.date);
    } else {
      const days = parseInt(settingsState.dateFilter);
      if (!isNaN(days)) await postsState.updatePostsForDays(settingsState.activeTopic, settingsState.date, days);
    }
  }, [app.vault, appHelper, settingsState, postsState, editorState]);

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
    const fromDateStr = post.timestamp.format("YYYY-MM-DD");
    const messageWithFrom = `${post.message} (from ${fromDateStr})`;
    const now = window.moment();
    const metadata = { ...post.metadata };
    if (!nextDay.isSame(now, "day")) metadata.posted = now.toISOString();

    const text = toText(messageWithFrom, false, settingsState.granularity, nextDay, metadata);
    await appHelper.insertTextAfter(nextNote, `\n${text}`, settings.insertAfter);
    await deletePost(post);
    new Notice("明日に送りました");
  }, [settingsState, noteState, settings, appHelper, deletePost]);

  const handleClickTime = useCallback((post: Post) => {
    (async () => {
      const path = post.path;
      const noteFile = app.vault.getAbstractFileByPath(path);
      if (!(noteFile instanceof TFile)) return;
      const leaf = app.workspace.getLeaf(true);
      await app.workspace.revealLeaf(leaf);
      await leaf.openFile(noteFile, { active: true });
      const editor = app.workspace.activeEditor!;
      const startPos = editor.editor!.offsetToPos(post.bodyStartOffset);
      const endPos = editor.editor!.offsetToPos(post.bodyStartOffset + post.message.length);
      const from = { line: startPos.line, ch: startPos.ch };
      const to = { line: endPos.line, ch: endPos.ch };
      queueMicrotask(() => {
        (editor as any).editMode!.highlightSearchMatches([{ from, to }]);
      });
    })();
  }, [app.vault, app.workspace]);

  return {
    handleSubmit,
    deletePost,
    movePostToTomorrow,
    handleClickTime,
  };
};
