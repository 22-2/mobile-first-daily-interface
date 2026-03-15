import { MarkdownView, Notice, TFile } from "obsidian";
import { useCallback } from "react";
import { useAppContext } from "src/ui/context/AppContext";
import { useEditorStore } from "src/ui/store/editorStore";
import { noteStore, useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { Post } from "src/ui/types";
import { resolveTimestamp, toText } from "src/ui/utils/post-utils";
import {
  buildPostFromEntry,
  createThreadId,
  isThreadRoot,
  THREAD_METADATA_KEYS,
} from "src/ui/utils/thread-utils";
import { getTopicNote } from "src/utils/daily-notes";
import { parseThinoEntries } from "src/utils/thino";
import { useShallow } from "zustand/shallow";
import { useRefreshPosts } from "./useRefreshPosts";

export const usePostActions = () => {
  const { app, appHelper, settings } = useAppContext();
  const refreshPosts = useRefreshPosts();

  const getSerializedTimestamp = useCallback(
    (timestamp: Post["timestamp"], noteDate: Post["noteDate"]) => {
      return timestamp.isSame(noteDate, "day")
        ? timestamp
        : noteDate.clone().endOf("day");
    },
    [],
  );

  const settingsState = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      granularity: s.granularity,
      activeTopic: s.activeTopic,
      dateFilter: s.dateFilter,
      asTask: s.asTask,
      setDate: s.setDate,
      setThreadFocusRootId: s.setThreadFocusRootId,
      isReadOnly: s.isReadOnly(),
      displayMode: s.displayMode,
      getEffectiveDate: s.getEffectiveDate,
      threadFocusRootId: s.threadFocusRootId,
    })),
  );

  const postsState = usePostsStore(
    useShallow((s) => ({
      posts: s.posts,
      updatePosts: s.updatePosts,
      updatePostsForWeek: s.updatePostsForWeek,
      updatePostsForDays: s.updatePostsForDays,
    })),
  );

  const editorState = useEditorStore(
    useShallow((s) => ({
      input: s.input,
      setInput: s.setInput,
      inputRef: s.inputRef,
      scrollContainerRef: s.scrollContainerRef,
      editingPost: s.getEditingPost(postsState.posts),
      canSubmit: s.canSubmit(postsState.posts),
      cancelEdit: s.cancelEdit,
    })),
  );

  const noteState = useNoteStore(
    useShallow((s) => ({
      currentDailyNote: s.currentDailyNote,
      replacePaths: s.replacePaths,
    })),
  );

  const getLatestPostsForPath = useCallback(
    async (path: string, noteDate: Post["noteDate"]) => {
      const content = await appHelper.loadFile(path);
      return parseThinoEntries(content).map((entry) =>
        buildPostFromEntry({
          ...entry,
          path,
          noteDate,
          resolveTimestamp,
        }),
      );
    },
    [appHelper],
  );

  const findLatestPost = useCallback(
    async (post: Post): Promise<Post | null> => {
      const latestPosts = await getLatestPostsForPath(post.path, post.noteDate);

      const latestById = latestPosts.find(
        (candidate) => candidate.id === post.id,
      );
      if (latestById) {
        return latestById;
      }

      return (
        latestPosts.find(
          (candidate) =>
            candidate.message === post.message &&
            candidate.timestamp.valueOf() === post.timestamp.valueOf(),
        ) ?? null
      );
    },
    [getLatestPostsForPath],
  );

  const findLatestThreadPosts = useCallback(
    async (rootPost: Post): Promise<Post[]> => {
      const latestPosts = await getLatestPostsForPath(
        rootPost.path,
        rootPost.noteDate,
      );
      return latestPosts.filter(
        (candidate) => candidate.threadRootId === rootPost.threadRootId,
      );
    },
    [getLatestPostsForPath],
  );

  // ---------------------------------------------------------------------------
  // 共通ヘルパー: 投稿を上書きして画面を更新する（削除・アーカイブ共通）
  // ---------------------------------------------------------------------------
  const replaceAndRefresh = useCallback(
    async (post: Post, extraMetadata: Record<string, string>) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        new Notice("投稿の位置を再特定できませんでした");
        await refreshPosts(post.path);
        return;
      }

      const metadata = {
        ...latestPost.metadata,
        ...extraMetadata,
      };
      const text = toText(
        latestPost.message,
        false,
        settingsState.granularity,
        latestPost.timestamp,
        metadata,
      );

      await appHelper.replaceRange(
        latestPost.path,
        latestPost.startOffset,
        latestPost.endOffset,
        text,
      );

      if (
        editorState.editingPost?.id === latestPost.id &&
        editorState.editingPost?.path === latestPost.path
      ) {
        editorState.cancelEdit();
      }

      await refreshPosts(latestPost.path);
    },
    [
      appHelper,
      settingsState.granularity,
      editorState,
      findLatestPost,
      refreshPosts,
    ],
  );

  const updateManyPosts = useCallback(
    async (
      posts: Post[],
      buildMetadata: (post: Post) => Record<string, string>,
    ) => {
      const latestPosts = (
        await Promise.all(posts.map((post) => findLatestPost(post)))
      ).filter((post): post is Post => post !== null);

      if (latestPosts.length === 0) {
        return;
      }

      const sortedPosts = [...latestPosts].sort(
        (left, right) => right.startOffset - left.startOffset,
      );

      for (const post of sortedPosts) {
        const text = toText(
          post.message,
          false,
          settingsState.granularity,
          post.noteDate,
          {
            ...post.metadata,
            ...buildMetadata(post),
          },
        );

        await appHelper.replaceRange(
          post.path,
          post.startOffset,
          post.endOffset,
          text,
        );
      }

      if (
        sortedPosts.some(
          (post) =>
            editorState.editingPost?.id === post.id &&
            editorState.editingPost?.path === post.path,
        )
      ) {
        editorState.cancelEdit();
      }

      const firstPath = sortedPosts[0]?.path;
      if (firstPath) {
        await refreshPosts(firstPath);
      }
    },
    [
      appHelper,
      editorState,
      findLatestPost,
      refreshPosts,
      settingsState.granularity,
    ],
  );

  // ---------------------------------------------------------------------------
  // 新規投稿 / 編集の確定
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    if (!editorState.canSubmit) return;

    const currentInput =
      editorState.inputRef.current?.getValue() ?? editorState.input;

    // --- 編集中の投稿を上書き ---
    if (editorState.editingPost?.path) {
      const latestEditingPost = await findLatestPost(editorState.editingPost);
      if (!latestEditingPost) {
        new Notice("編集中の投稿を再特定できませんでした");
        await refreshPosts(editorState.editingPost.path);
        return;
      }

      const now = window.moment();

      let targetTs = latestEditingPost.timestamp;
      if (settings.updateDateStrategy === "always") {
        targetTs = now;
      } else if (
        settings.updateDateStrategy === "same_day" &&
        latestEditingPost.timestamp.isSame(now, "day")
      ) {
        targetTs = now;
      }

      const text = toText(
        currentInput,
        false,
        settingsState.granularity,
        targetTs,
        latestEditingPost.metadata,
      );
      await appHelper.replaceRange(
        latestEditingPost.path,
        latestEditingPost.startOffset,
        latestEditingPost.endOffset,
        text,
      );
      editorState.cancelEdit();
      await refreshPosts(latestEditingPost.path);
      return;
    }

    // --- 新規投稿 ---
    const now = window.moment();
    const metadata: Record<string, string> = {};

    if (settingsState.threadFocusRootId) {
      const rootPost = postsState.posts.find(
        (post) => post.id === settingsState.threadFocusRootId,
      );
      if (!rootPost) {
        new Notice("スレッドの親投稿が見つかりませんでした");
        settingsState.setThreadFocusRootId(null);
        return;
      }

      metadata[THREAD_METADATA_KEYS.PARENT_ID] =
        settingsState.threadFocusRootId;
      // Attach `posted` only when replying across dates (keep same-day replies timestamped normally)
      if (!now.isSame(rootPost.noteDate, "day")) {
        metadata.posted = now.toISOString();
      }

      const text = toText(
        currentInput,
        false,
        settingsState.granularity,
        getSerializedTimestamp(now, rootPost.noteDate),
        metadata,
      );
      if (!text) {
        editorState.setInput("");
        editorState.inputRef.current?.setContent("");
        return;
      }

      const noteFile = app.vault.getAbstractFileByPath(rootPost.path);
      if (!(noteFile instanceof TFile)) {
        new Notice("スレッドの投稿先ノートを解決できませんでした");
        return;
      }

      await appHelper.insertTextAfter(noteFile, text, settings.insertAfter);
      await refreshPosts(rootPost.path);

      editorState.setInput("");
      editorState.inputRef.current?.setContent("");
      editorState.scrollContainerRef.current?.scrollTo({ top: 0 });
      return;
    }

    // タイムライン表示時は常に今日のノートに投稿
    const targetDate = settingsState.getEffectiveDate();
    if (!targetDate.isSame(now, "day")) {
      metadata.posted = now.toISOString();
    }

    const text = toText(
      currentInput,
      settingsState.asTask,
      settingsState.granularity,
      undefined,
      metadata,
    );
    if (!text) {
      editorState.setInput("");
      editorState.inputRef.current?.setContent("");
      return;
    }

    let note = getTopicNote(
      app,
      targetDate,
      settingsState.granularity,
      settingsState.activeTopic,
    );

    if (!note) {
      note = await noteStore
        .getState()
        .createNoteWithInsertAfter(app, settings, targetDate);
    }

    if (note) {
      // ensure insertAfter marker exists in note; if missing, append it so we can
      // reliably insert after that marker
      const content = await appHelper.loadFile(note.path);
      if (settings.insertAfter && !content.includes(settings.insertAfter)) {
        await appHelper.insertTextAfter(note, settings.insertAfter, "");
      }

      await appHelper.insertTextAfter(note, text, settings.insertAfter);
      await refreshPosts(note.path);
    } else {
      new Notice("投稿先ノートを解決できませんでした");
      return;
    }

    editorState.setInput("");
    editorState.inputRef.current?.setContent("");
    editorState.scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [
    app,
    appHelper,
    settings,
    settingsState,
    postsState,
    editorState,
    noteState,
    refreshPosts,
  ]);

  // ---------------------------------------------------------------------------
  // 投稿を削除（削除フラグを付与して上書き）
  // ---------------------------------------------------------------------------
  const deletePost = useCallback(
    async (post: Post) => {
      const now = window.moment();

      if (isThreadRoot(post)) {
        const latestThreadPosts = await findLatestThreadPosts(post);
        if (latestThreadPosts.length === 0) {
          new Notice("スレッドの投稿を再特定できませんでした");
          await refreshPosts(post.path);
          return;
        }

        await updateManyPosts(latestThreadPosts, () => ({
          deleted: now.format("YYYYMMDDHHmmss"),
        }));

        if (settingsState.threadFocusRootId === post.threadRootId) {
          settingsState.setThreadFocusRootId(null);
        }
        return;
      }

      await replaceAndRefresh(post, { deleted: now.format("YYYYMMDDHHmmss") });
    },
    [postsState.posts, replaceAndRefresh, settingsState, updateManyPosts],
  );

  // ---------------------------------------------------------------------------
  // 投稿をアーカイブ（アーカイブフラグを付与して上書き）
  // ---------------------------------------------------------------------------
  const archivePost = useCallback(
    async (post: Post) => {
      const now = window.moment();
      await replaceAndRefresh(post, { archived: now.format("YYYYMMDDHHmmss") });
    },
    [replaceAndRefresh],
  );

  // ---------------------------------------------------------------------------
  // 投稿を翌日へ移動
  // ---------------------------------------------------------------------------
  const movePostToTomorrow = useCallback(
    async (post: Post) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        new Notice("投稿の位置を再特定できませんでした");
        await refreshPosts(post.path);
        return;
      }

      if (latestPost.threadRootId) {
        new Notice("スレッド投稿は明日に送れません");
        return;
      }

      if (settingsState.isReadOnly) {
        new Notice("過去のノートの投稿は移動できません");
        return;
      }

      const nextDay = latestPost.timestamp.clone().add(1, "day");
      const nextNote = await noteStore
        .getState()
        .createNoteWithInsertAfter(app, settings, nextDay);
      if (!nextNote) {
        new Notice("明日のノートが見つかりませんでした");
        return;
      }

      const now = window.moment();
      const metadata = { ...latestPost.metadata };
      if (!nextDay.isSame(now, "day")) metadata.posted = now.toISOString();

      const messageWithFrom = `${latestPost.message} (from ${latestPost.timestamp.format("YYYY-MM-DD")})`;
      const text = toText(
        messageWithFrom,
        false,
        settingsState.granularity,
        nextDay,
        metadata,
      );

      await appHelper.insertTextAfter(nextNote, text, settings.insertAfter);
      await deletePost(latestPost);

      new Notice("明日に送りました");
    },
    [app, appHelper, settings, settingsState, deletePost],
  );

  const createThread = useCallback(
    async (post: Post) => {
      if (post.threadRootId === post.id) {
        settingsState.setThreadFocusRootId(post.id, post.noteDate);
        return;
      }

      if (post.threadRootId && post.threadRootId !== post.id) {
        new Notice("返信からはスレッドを作成できません");
        return;
      }

      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        new Notice("投稿の位置を再特定できませんでした");
        await refreshPosts(post.path);
        return;
      }

      const rootId = createThreadId();
      const text = toText(
        latestPost.message,
        false,
        settingsState.granularity,
        getSerializedTimestamp(latestPost.timestamp, latestPost.noteDate),
        {
          ...latestPost.metadata,
          [THREAD_METADATA_KEYS.ID]: rootId,
        },
      );

      await appHelper.replaceRange(
        latestPost.path,
        latestPost.startOffset,
        latestPost.endOffset,
        text,
      );

      if (
        editorState.editingPost?.id === latestPost.id &&
        editorState.editingPost?.path === latestPost.path
      ) {
        editorState.cancelEdit();
      }

      await refreshPosts(latestPost.path);
      // 新しく作成したスレッドに切り替える
      settingsState.setThreadFocusRootId(rootId, latestPost.noteDate);
      new Notice("スレッドを作成しました");
    },
    [
      appHelper,
      editorState,
      findLatestPost,
      getSerializedTimestamp,
      refreshPosts,
      settingsState,
    ],
  );

  // ---------------------------------------------------------------------------
  // 投稿をクリックしてエディタで該当箇所をハイライト
  // ---------------------------------------------------------------------------
  const handleClickTime = useCallback(
    (post: Post) => {
      (async () => {
        const latestPost = await findLatestPost(post);
        if (!latestPost) {
          new Notice("投稿の位置を再特定できませんでした");
          await refreshPosts(post.path);
          return;
        }

        const noteFile = app.vault.getAbstractFileByPath(latestPost.path);
        if (!(noteFile instanceof TFile)) return;

        const leaf = app.workspace.getLeaf(true);
        await app.workspace.revealLeaf(leaf);
        await leaf.openFile(noteFile, { active: true });

        const editor = app.workspace.activeEditor as MarkdownView;
        const startPos = editor.editor!.offsetToPos(latestPost.bodyStartOffset);
        const endPos = editor.editor!.offsetToPos(
          latestPost.bodyStartOffset + latestPost.message.length,
        );

        queueMicrotask(() => {
          editor.editMode!.highlightSearchMatches([
            {
              from: { line: startPos.line, ch: startPos.ch },
              to: { line: endPos.line, ch: endPos.ch },
            },
          ]);
        });
      })();
    },
    [app.vault, app.workspace, findLatestPost, refreshPosts],
  );

  return {
    handleSubmit,
    createThread,
    deletePost,
    archivePost,
    movePostToTomorrow,
    handleClickTime,
  };
};
