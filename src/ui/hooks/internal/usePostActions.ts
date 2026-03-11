import { Notice, TFile } from "obsidian";
import { useCallback } from "react";
import { AppHelper } from "src/app-helper";
import { Settings } from "src/settings";
import { Granularity, MomentLike, Post } from "src/ui/types";
import { toText } from "src/ui/utils/post-utils";
import { getTopicNote } from "src/utils/daily-notes";
import { ObsidianLiveEditorRef } from "src/ui/components/common/ObsidianLiveEditor";

interface UsePostActionsProps {
  appHelper: AppHelper;
  settings: Settings;
  date: MomentLike;
  granularity: Granularity;
  activeTopic: string;
  dateFilter: string;
  currentDailyNote: TFile | null;
  posts: Post[];
  input: string;
  asTask: boolean;
  editingPost: Post | null;
  canSubmit: boolean;
  inputRef: React.RefObject<ObsidianLiveEditorRef | null>;
  isReadOnly: boolean;
  
  // Setters/Updaters
  setInput: (v: string) => void;
  setDate: (v: MomentLike) => void;
  cancelEdit: () => void;
  updatePosts: (file: TFile) => Promise<void>;
  updatePostsForWeek: (topicId: string) => Promise<Set<string>>;
  updatePostsForDays: (topicId: string, days: number) => Promise<{ paths: Set<string>; hasMore: boolean; lastSearchedDate: MomentLike }>;
  replacePaths: (paths: Set<string>) => void;
  createNoteWithInsertAfter: (targetDate?: MomentLike) => Promise<TFile | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const usePostActions = ({
  appHelper,
  settings,
  date,
  granularity,
  activeTopic,
  dateFilter,
  currentDailyNote,
  input,
  asTask,
  editingPost,
  canSubmit,
  inputRef,
  isReadOnly,
  setInput,
  setDate,
  cancelEdit,
  updatePosts,
  updatePostsForWeek,
  updatePostsForDays,
  replacePaths,
  createNoteWithInsertAfter,
  scrollContainerRef,
}: UsePostActionsProps) => {
  const app = appHelper.getApp();

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    const currentInput = inputRef.current?.getValue() ?? input;

    if (editingPost) {
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
        const text = toText(
          currentInput,
          false,
          granularity,
          targetTs,
          editingPost.metadata,
        );
        await appHelper.replaceRange(
          path,
          editingPost.startOffset,
          editingPost.endOffset,
          text,
        );
        cancelEdit();
        // 更新対象のノートを再読込
        const noteFile = app.vault.getAbstractFileByPath(path);
        if (noteFile instanceof TFile) {
          if (dateFilter === "today") {
            await updatePosts(noteFile);
          } else if (dateFilter === "this_week") {
            await updatePostsForWeek(activeTopic);
          } else {
            const days = parseInt(dateFilter);
            if (!isNaN(days)) await updatePostsForDays(activeTopic, days);
          }
        }
        return;
      }
    }

    const now = window.moment();
    const metadata: Record<string, string> = {};
    if (!date.isSame(now, "day")) {
      metadata.posted = now.toISOString();
    }

    const text = toText(currentInput, asTask, granularity, undefined, metadata);
    if (!text) {
      setInput("");
      inputRef.current?.setContent("");
      return;
    }

    if (!currentDailyNote) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      await createNoteWithInsertAfter();
      if (dateFilter !== "today") {
        const updateFn =
          dateFilter === "this_week"
            ? () => updatePostsForWeek(activeTopic).then(paths => ({ paths }))
            : () => updatePostsForDays(activeTopic, parseInt(dateFilter));
        updateFn().then(({ paths }) => {
          replacePaths(paths);
        });
      }
      setDate(date.clone());
    }
    const note = getTopicNote(app, date, granularity, activeTopic);
    if (note) {
      await appHelper.insertTextAfter(note, `\n${text}`, settings.insertAfter);
    }
    setInput("");
    inputRef.current?.setContent("");
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [
    canSubmit,
    editingPost,
    currentDailyNote,
    settings,
    granularity,
    appHelper,
    input,
    asTask,
    date,
    activeTopic,
    updatePosts,
    updatePostsForWeek,
    updatePostsForDays,
    createNoteWithInsertAfter,
    cancelEdit,
    setInput,
    setDate,
    dateFilter,
    inputRef,
    replacePaths,
    scrollContainerRef,
    app.vault,
  ]);

  const deletePost = useCallback(
    async (post: Post) => {
      const path = post.path;
      const targetTs = post.timestamp;
      const now = window.moment();
      const metadata = { ...post.metadata, deleted: now.format("YYYYMMDDHHmmss") };

      const text = toText(
        post.message,
        false,
        granularity,
        targetTs,
        metadata,
      );

      await appHelper.replaceRange(path, post.startOffset, post.endOffset, text);
      if (editingPost?.startOffset === post.startOffset && editingPost?.path === post.path) cancelEdit();

      if (dateFilter === "today") {
        const noteFile = app.vault.getAbstractFileByPath(path);
        if (noteFile instanceof TFile) await updatePosts(noteFile);
      } else if (dateFilter === "this_week") {
        await updatePostsForWeek(activeTopic);
      } else {
        const days = parseInt(dateFilter);
        if (!isNaN(days)) await updatePostsForDays(activeTopic, days);
      }
    },
    [
      app.vault,
      appHelper,
      editingPost,
      cancelEdit,
      updatePosts,
      updatePostsForWeek,
      updatePostsForDays,
      activeTopic,
      dateFilter,
      granularity,
    ],
  );

  const movePostToTomorrow = useCallback(
    async (post: Post) => {
      if (isReadOnly) {
        new Notice("過去のノートの投稿は移動できません");
        return;
      }

      const nextDay = post.timestamp.clone().add(1, "day");
      const nextNote = await createNoteWithInsertAfter(nextDay);
      if (!nextNote) {
        new Notice("明日のノートが見つかりませんでした");
        return;
      }

      const fromDateStr = post.timestamp.format("YYYY-MM-DD");
      const messageWithFrom = `${post.message} (from ${fromDateStr})`;
      const now = window.moment();
      const metadata = { ...post.metadata };
      if (!nextDay.isSame(now, "day")) {
        metadata.posted = now.toISOString();
      }

      const text = toText(
        messageWithFrom,
        false,
        granularity,
        nextDay,
        metadata,
      );
      await appHelper.insertTextAfter(
        nextNote,
        `\n${text}`,
        settings.insertAfter,
      );

      await deletePost(post);
      new Notice("明日に送りました");
    },
    [
      appHelper,
      deletePost,
      isReadOnly,
      granularity,
      settings.insertAfter,
      createNoteWithInsertAfter,
    ],
  );

  const handleClickTime = useCallback(
    (post: Post) => {
      (async () => {
        const path = post.path;
        const noteFile = app.vault.getAbstractFileByPath(path);
        if (!(noteFile instanceof TFile)) return;
        const leaf = app.workspace.getLeaf(true);
        await app.workspace.revealLeaf(leaf);
        await leaf.openFile(noteFile, { active: true });
        const editor = app.workspace.activeEditor!;
        const startPos = editor.editor!.offsetToPos(post.bodyStartOffset);
        const endPos = editor.editor!.offsetToPos(
          post.bodyStartOffset + post.message.length,
        );
        const from = { line: startPos.line, ch: startPos.ch };
        const to = { line: endPos.line, ch: endPos.ch };
        queueMicrotask(() => {
          (editor as any).editMode!.highlightSearchMatches([{ from, to }]);
        });
      })();
    },
    [app.vault, app.workspace],
  );

  return {
    handleSubmit,
    deletePost,
    movePostToTomorrow,
    handleClickTime,
  };
};
