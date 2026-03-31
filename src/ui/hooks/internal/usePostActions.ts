import type { MarkdownView } from "obsidian";
import { Notice, TFile } from "obsidian";
import { useCallback } from "react";
import { resolveNoteSource } from "src/core/note-source";
import { resolveTimestamp, toText } from "src/core/post-utils";
import { serializeMfdiTags, TAG_METADATA_KEY } from "src/core/tags";
import { parseThinoEntries } from "src/core/thino";
import { useAppContext } from "src/ui/context/AppContext";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { createRefreshPosts } from "src/ui/hooks/internal/refreshPosts";
import { useCurrentAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { Post } from "src/ui/types";
import {
  buildPostFromEntry,
  createThreadId,
  isThreadRoot,
  THREAD_METADATA_KEYS,
} from "src/ui/utils/thread-utils";
import { isTimelineView } from "src/ui/utils/view-mode";
import { useShallow } from "zustand/shallow";

export const usePostActions = () => {
  const { shell, settings } = useAppContext();
  const store = useCurrentAppStore();

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
      viewNoteMode: s.viewNoteMode,
    })),
  );

  const { posts: allPosts } = useUnifiedPosts();

  const editorState = useEditorStore(
    useShallow((s) => ({
      inputSnapshot: s.inputSnapshot,
      getInputValue: s.getInputValue,
      clearInput: s.clearInput,
      inputRef: s.inputRef,
      scrollContainerRef: s.scrollContainerRef,
      editingPost: s.editingPost,
      canSubmit: (posts: Post[]) => s.canSubmit(posts),
      cancelEdit: s.cancelEdit,
    })),
  );

  const noteState = useNoteStore(
    useShallow((s) => ({
      currentDailyNote: s.currentDailyNote,
      replacePaths: s.replacePaths,
    })),
  );

  const refreshPosts = useCallback(
    createRefreshPosts({
      activeTopic: settingsState.activeTopic,
      displayMode: settingsState.displayMode,
    }),
    [
      settingsState.activeTopic,
      settingsState.displayMode,
    ],
  );

  const getLatestPostsForPath = useCallback(
    async (path: string, noteDate: Post["noteDate"]) => {
      const content = await shell.loadFile(path);
      return parseThinoEntries(content).map((entry) =>
        buildPostFromEntry({
          ...entry,
          path,
          noteDate,
          resolveTimestamp,
        }),
      );
    },
    [shell],
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

      // IDで見つからない場合は、内容と日時が完全に一致する投稿を探す（位置が変わっている可能性があるため）
      return (
        latestPosts.find(
          (candidate) =>
            candidate.message.trim() === post.message.trim() &&
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

      await shell.replaceRange(
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
      shell,
      settingsState.granularity,
      editorState,
      findLatestPost,
      refreshPosts,
    ],
  );

  const replaceAndRefreshWithMetadata = useCallback(
    async (
      post: Post,
      transformMetadata: (
        metadata: Record<string, string>,
      ) => Record<string, string>,
    ) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        new Notice("投稿の位置を再特定できませんでした");
        await refreshPosts(post.path);
        return;
      }

      const metadata = transformMetadata({ ...latestPost.metadata });
      const text = toText(
        latestPost.message,
        false,
        settingsState.granularity,
        latestPost.timestamp,
        metadata,
      );

      await shell.replaceRange(
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
      shell,
      editorState,
      findLatestPost,
      refreshPosts,
      settingsState.granularity,
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

        await shell.replaceRange(
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
      shell,
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

    // タイムライン表示時は日付が変わったら自動で今日のノートに切り替える
    if (isTimelineView(settingsState.displayMode)) {
      const now = window.moment();
      if (!settingsState.date.isSame(now, "day")) {
        settingsState.setDate(now);
      }
    }

    const currentInput = editorState.getInputValue();

    // --- 編集中の投稿を上書き ---
    if (editorState.editingPost) {
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
      await shell.replaceRange(
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
      const rootPost = allPosts.find(
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
        editorState.clearInput();
        return;
      }

      const noteFile = shell.getAbstractFileByPath(rootPost.path);
      if (!(noteFile instanceof TFile)) {
        new Notice("スレッドの投稿先ノートを解決できませんでした");
        return;
      }

      await shell.insertTextAfter(noteFile, text, settings.insertAfter);
      await refreshPosts(rootPost.path);

      editorState.clearInput();
      editorState.scrollContainerRef.current?.scrollTo({ top: 0 });
      return;
    }

    // タイムライン表示時は常に今日のノートに投稿
    const targetDate = settingsState.getEffectiveDate();
    if (settingsState.viewNoteMode === "fixed") {
      metadata.posted = now.toISOString();
    } else if (!targetDate.isSame(now, "day")) {
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
      editorState.clearInput();
      return;
    }

    const noteSource = resolveNoteSource({
      shell,
      date: targetDate,
      granularity: settingsState.granularity,
      activeTopic: settingsState.activeTopic,
      noteMode: settingsState.viewNoteMode,
      fixedNotePath: store.getState().fixedNotePath,
    });

    let note = noteState.currentDailyNote;
    if (noteSource.mode !== "fixed") {
      note = noteSource.resolveCurrentNote();
    }

    if (!note) {
      note = await store
        .getState()
        .createNoteWithInsertAfter(
          shell,
          settings,
          noteSource.mode === "fixed" ? undefined : targetDate,
        );
    }

    if (note) {
      // ensure insertAfter marker exists in note; if missing, append it so we can
      // reliably insert after that marker
      const content = await shell.loadFile(note.path);
      if (settings.insertAfter && !content.includes(settings.insertAfter)) {
        await shell.insertTextAfter(note, settings.insertAfter, "");
      }

      await shell.insertTextAfter(note, text, settings.insertAfter);
      await refreshPosts(note.path);
    } else {
      new Notice("投稿先ノートを解決できませんでした");
      return;
    }

    editorState.clearInput();
    editorState.scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [
    shell,
    settings,
    settingsState,
    allPosts,
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
    [allPosts, replaceAndRefresh, settingsState, updateManyPosts],
  );

  // ---------------------------------------------------------------------------
  // 投稿を恒久削除（ファイル中の該当エントリを完全に取り除く）
  // ---------------------------------------------------------------------------
  const permanentlyDeletePost = useCallback(
    async (post: Post) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        new Notice("投稿の位置を再特定できませんでした");
        await refreshPosts(post.path);
        return;
      }

      if (isThreadRoot(latestPost)) {
        const latestThreadPosts = await findLatestThreadPosts(latestPost);
        if (latestThreadPosts.length === 0) {
          new Notice("スレッドの投稿を再特定できませんでした");
          await refreshPosts(post.path);
          return;
        }

        // 削除範囲が後ろから前に進むようソートして順に削除（オフセットズレ対策）
        const sorted = latestThreadPosts
          .slice()
          .sort((a, b) => b.startOffset - a.startOffset);

        for (const p of sorted) {
          await shell.replaceRange(p.path, p.startOffset, p.endOffset, "");
        }

        // ファイル整形: 連続改行を適度に潰す
        const filePath = sorted[0]?.path;
        if (filePath) {
          let newContent = await shell.loadFile(filePath);
          newContent = newContent.replace(/\n{4,}/g, "\n\n\n");
          await shell.writeFile(filePath, newContent);
          await refreshPosts(filePath);
        }

        if (settingsState.threadFocusRootId === latestPost.threadRootId) {
          settingsState.setThreadFocusRootId(null);
        }
        return;
      }

      // 単一投稿の削除
      await shell.replaceRange(
        latestPost.path,
        latestPost.startOffset,
        latestPost.endOffset,
        "",
      );
      let newContent = await shell.loadFile(latestPost.path);
      newContent = newContent.replace(/\n{4,}/g, "\n\n\n");
      await shell.writeFile(latestPost.path, newContent);
      await refreshPosts(latestPost.path);
    },
    [shell, findLatestPost, findLatestThreadPosts, refreshPosts, settingsState],
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

  const setPostTags = useCallback(
    async (post: Post, rawInput: string) => {
      await replaceAndRefreshWithMetadata(post, (metadata) => {
        const serializedTags = serializeMfdiTags(rawInput.split(","));

        if (serializedTags.length === 0) {
          delete metadata[TAG_METADATA_KEY];
          return metadata;
        }

        metadata[TAG_METADATA_KEY] = serializedTags;
        return metadata;
      });
    },
    [replaceAndRefreshWithMetadata],
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

      if (settingsState.viewNoteMode === "fixed") {
        new Notice("固定ノートモードでは利用できません");
        return;
      }

      const nextDay = latestPost.timestamp.clone().add(1, "day");
      const nextNote = await store
        .getState()
        .createNoteWithInsertAfter(shell, settings, nextDay);
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

      await shell.insertTextAfter(nextNote, text, settings.insertAfter);
      await deletePost(latestPost);

      new Notice("明日に送りました");
    },
    [shell, settings, settingsState, deletePost, store],
  );

  const copyBlockIdLink = useCallback(
    async (post: Post) => {
      let blockId = post.metadata.blockId;
      if (!blockId) {
        blockId = Math.random().toString(36).substring(2, 8);
        await replaceAndRefresh(post, { blockId });
      }

      const file = shell.getVault().getAbstractFileByPath(post.path);
      if (!(file instanceof TFile)) {
        new Notice("ファイルを特定できませんでした");
        return;
      }

      const link = shell
        .getRawApp()
        .fileManager.generateMarkdownLink(file, "", `#^${blockId}`);
      await navigator.clipboard.writeText(link);
      new Notice("ブロックIDリンクをコピーしました");
    },
    [allPosts, replaceAndRefresh],
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

      await shell.replaceRange(
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

      settingsState.setThreadFocusRootId(rootId, latestPost.noteDate);
      await refreshPosts(latestPost.path);
      new Notice("スレッドを作成しました");
    },
    [
      shell,
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

        const noteFile = shell.getAbstractFileByPath(latestPost.path);
        if (!(noteFile instanceof TFile)) return;

        const leaf = shell.getLeaf(true);
        await shell.revealLeaf(leaf);
        await leaf.openFile(noteFile, { active: true });

        const editor = shell.getWorkspace().activeEditor as MarkdownView;
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
    [shell, findLatestPost, refreshPosts],
  );

  return {
    handleSubmit,
    createThread,
    deletePost,
    permanentlyDeletePost,
    archivePost,
    setPostTags,
    movePostToTomorrow,
    handleClickTime,
    copyBlockIdLink,
  };
};
