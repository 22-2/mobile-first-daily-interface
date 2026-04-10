import { Notice, TFile } from "obsidian";
import { useCallback } from "react";
import { resolveNoteSource } from "src/core/note-source";
import { resolveTimestamp, toText } from "src/core/post-utils";
import { serializeMfdiTags, TAG_METADATA_KEY } from "src/core/tags";
import { parseThinoEntries } from "src/core/thino";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { createRefreshPosts } from "src/ui/hooks/internal/refreshPosts";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { useCurrentAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { Post } from "src/ui/types";
import { PINNED_METADATA_KEY } from "src/ui/utils/post-metadata";
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

  // ── Selectors ──────────────────────────────────────────────────────────────

  const settingsState = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      granularity: s.granularity,
      activeTopic: s.activeTopic,
      dateFilter: s.dateFilter,
      searchQuery: s.searchQuery,
      threadOnly: s.threadOnly,
      asTask: s.asTask,
      setAsTask: s.setAsTask,
      setDate: s.setDate,
      setGranularity: s.setGranularity,
      setTimeFilter: s.setTimeFilter,
      setDateFilter: s.setDateFilter,
      setActiveTag: s.setActiveTag,
      setSearchQuery: s.setSearchQuery,
      setThreadOnly: s.setThreadOnly,
      setDisplayMode: s.setDisplayMode,
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
      setHighlightedPost: s.setHighlightedPost,
      canSubmit: s.canSubmit,
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
      timelineDayKey: settingsState.date.format("YYYY-MM-DD"),
      searchQuery: settingsState.searchQuery,
      threadOnly: settingsState.threadOnly,
    }),
    [
      settingsState.activeTopic,
      settingsState.displayMode,
      settingsState.date,
      settingsState.searchQuery,
      settingsState.threadOnly,
    ],
  );

  // ── Low-level helpers ──────────────────────────────────────────────────────

  /** テキストに保存するタイムスタンプを解決する（別日ならノート末尾に丸める） */
  const getSerializedTimestamp = useCallback(
    (timestamp: Post["timestamp"], noteDate: Post["noteDate"]) =>
      timestamp.isSame(noteDate, "day")
        ? timestamp
        : noteDate.clone().endOf("day"),
    [],
  );

  /** ファイルの連続改行（4行以上）を最大3行に正規化する */
  const normalizeFileContent = useCallback(
    async (filePath: string) => {
      const content = await shell.loadFile(filePath);
      await shell.writeFile(filePath, content.replace(/\n{4,}/g, "\n\n\n"));
    },
    [shell],
  );

  /** 投稿が現在編集中であれば編集をキャンセルする */
  const cancelEditIfActive = useCallback(
    (post: Post) => {
      if (
        editorState.editingPost?.id === post.id &&
        editorState.editingPost?.path === post.path
      ) {
        editorState.cancelEdit();
      }
    },
    [editorState],
  );

  /** 投稿が見つからなかった場合にNoticeを表示しリフレッシュする */
  const notifyNotFoundAndRefresh = useCallback(
    async (path: string, message = "投稿の位置を再特定できませんでした") => {
      new Notice(message);
      await refreshPosts(path);
    },
    [refreshPosts],
  );

  // ── Post-resolution helpers ────────────────────────────────────────────────

  const getLatestPostsForPath = useCallback(
    async (path: string, noteDate: Post["noteDate"]) => {
      const content = await shell.loadFile(path);
      return parseThinoEntries(content).map((entry) =>
        buildPostFromEntry({ ...entry, path, noteDate, resolveTimestamp }),
      );
    },
    [shell],
  );

  const findLatestPost = useCallback(
    async (post: Post): Promise<Post | null> => {
      const latestPosts = await getLatestPostsForPath(post.path, post.noteDate);

      const latestById = latestPosts.find((p) => p.id === post.id);
      if (latestById) return latestById;

      // IDで見つからない場合は、内容と日時が完全に一致する投稿を探す（位置が変わっている可能性があるため）
      return (
        latestPosts.find(
          (p) =>
            p.message.trim() === post.message.trim() &&
            p.timestamp.valueOf() === post.timestamp.valueOf(),
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
        (p) => p.threadRootId === rootPost.threadRootId,
      );
    },
    [getLatestPostsForPath],
  );

  // ── Core write helpers ─────────────────────────────────────────────────────

  /**
   * 投稿のメタデータを変換して上書き保存し、画面を更新する。
   * `transformMetadata` に `(prev) => next` の形で渡す。
   * 単純な追加・上書きは `(prev) => ({ ...prev, ...extra })` を返せばよい。
   */
  const replacePostAndRefresh = useCallback(
    async (
      post: Post,
      transformMetadata: (
        prev: Record<string, string>,
      ) => Record<string, string>,
    ) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
        return;
      }

      const text = toText(
        latestPost.message,
        false,
        settingsState.granularity,
        latestPost.timestamp,
        transformMetadata({ ...latestPost.metadata }),
      );

      await shell.replaceRange(
        latestPost.path,
        latestPost.startOffset,
        latestPost.endOffset,
        text,
      );

      cancelEditIfActive(latestPost);
      await refreshPosts(latestPost.path);
    },
    [
      shell,
      settingsState.granularity,
      findLatestPost,
      cancelEditIfActive,
      notifyNotFoundAndRefresh,
      refreshPosts,
    ],
  );

  /** 複数投稿を後ろから上書き保存し、画面を更新する（オフセットズレ対策） */
  const updateManyPosts = useCallback(
    async (
      posts: Post[],
      buildMetadata: (post: Post) => Record<string, string>,
    ) => {
      const latestPosts = (
        await Promise.all(posts.map((post) => findLatestPost(post)))
      ).filter((post): post is Post => post !== null);

      if (latestPosts.length === 0) return;

      const sortedPosts = [...latestPosts].sort(
        (a, b) => b.startOffset - a.startOffset,
      );

      for (const post of sortedPosts) {
        const text = toText(
          post.message,
          false,
          settingsState.granularity,
          post.noteDate,
          { ...post.metadata, ...buildMetadata(post) },
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
      if (firstPath) await refreshPosts(firstPath);
    },
    [
      shell,
      editorState,
      findLatestPost,
      refreshPosts,
      settingsState.granularity,
    ],
  );

  // ── handleSubmit sub-handlers ──────────────────────────────────────────────

  /** 編集中の投稿を確定する */
  const handleEditSubmit = useCallback(
    async (currentInput: string) => {
      const editingPost = editorState.editingPost!;
      const latestPost = await findLatestPost(editingPost);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(
          editingPost.path,
          "編集中の投稿を再特定できませんでした",
        );
        return;
      }

      const now = window.moment();
      let targetTs = latestPost.timestamp;
      if (settings.updateDateStrategy === "always") {
        targetTs = now;
      } else if (
        settings.updateDateStrategy === "same_day" &&
        latestPost.timestamp.isSame(now, "day")
      ) {
        targetTs = now;
      }

      const text = toText(
        currentInput,
        false,
        settingsState.granularity,
        targetTs,
        latestPost.metadata,
      );

      await shell.replaceRange(
        latestPost.path,
        latestPost.startOffset,
        latestPost.endOffset,
        text,
      );
      editorState.cancelEdit();
      await refreshPosts(latestPost.path);
    },
    [
      shell,
      settings,
      settingsState.granularity,
      editorState,
      findLatestPost,
      notifyNotFoundAndRefresh,
      refreshPosts,
    ],
  );

  /** スレッドへの返信を投稿する */
  const handleThreadReplySubmit = useCallback(
    async (currentInput: string) => {
      const rootPost = allPosts.find(
        (p) => p.id === settingsState.threadFocusRootId,
      );
      if (!rootPost) {
        new Notice("スレッドの親投稿が見つかりませんでした");
        settingsState.setThreadFocusRootId(null);
        return;
      }

      const now = window.moment();
      const metadata: Record<string, string> = {
        [THREAD_METADATA_KEYS.PARENT_ID]: settingsState.threadFocusRootId!,
      };
      // 日をまたぐ返信には `posted` を付与（同日返信は通常通りタイムスタンプ）
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
    },
    [
      shell,
      settings,
      settingsState,
      allPosts,
      editorState,
      getSerializedTimestamp,
      refreshPosts,
    ],
  );

  /** 通常の新規投稿を行う */
  const handleNewPostSubmit = useCallback(
    async (currentInput: string) => {
      const now = window.moment();
      const targetDate = settingsState.getEffectiveDate();
      const metadata: Record<string, string> = {};

      // 日をまたぐ投稿には `posted` を付与（同日投稿は通常通りタイムスタンプ）
      if (
        settingsState.viewNoteMode === "fixed" ||
        !targetDate.isSame(now, "day")
      ) {
        metadata.posted = now.toISOString();
      }

      const text = toText(
        currentInput,
        settingsState.asTask,
        settingsState.granularity,
        undefined,
        metadata,
      );

      // テキストが空なら投稿しない（空タスクも不可）
      if (!text) {
        new Notice("空の投稿はできません");
        return;
      }

      // 投稿先ノートを解決する。固定ノートモードなら常に同じノート、そうでなければ基準日に応じたノート。
      const noteSource = resolveNoteSource({
        shell,
        date: targetDate,
        granularity: settingsState.granularity,
        activeTopic: settingsState.activeTopic,
        noteMode: settingsState.viewNoteMode,
        fixedNotePath: store.getState().fixedNotePath,
      });

      let note = noteState.currentDailyNote;

      // 固定ノートモードでない場合は、基準日に応じたノートを解決する
      if (noteSource.mode !== "fixed") {
        note = noteSource.resolveCurrentNote();
      }

      if (!note) {
        // 存在しない場合はノートを作成してから再度解決する（特にタイムラインモード）
        note = await store
          .getState()
          .createNoteWithInsertAfter(
            shell,
            settings,
            noteSource.mode === "fixed" ? undefined : targetDate,
          );
      }

      if (!note) {
        new Notice("投稿先ノートを解決できませんでした");
        return;
      }

      // insertAfter マーカーが存在しない場合は末尾に追記しておく
      const content = await shell.loadFile(note.path);
      if (settings.insertAfter && !content.includes(settings.insertAfter)) {
        await shell.insertTextAfter(note, settings.insertAfter, "");
      }

      await shell.insertTextAfter(note, text, settings.insertAfter);

      if (
        isTimelineView(settingsState.displayMode) &&
        !settingsState.date.isSame(targetDate, "day")
      ) {
        // 意図: 日付跨ぎ直後は submit 冒頭の setDate だけだと、
        // 非同期処理をまたぐ間にタイムライン基準日が旧日のまま再検証されることがある。
        // 実際に投稿先ノートが確定した時点で再度同期し、refreshPosts の対象日を固定する。
        settingsState.setDate(targetDate.clone());
      }

      editorState.clearInput();
      shell.trigger("mfdi:scroll-to-top");

      await refreshPosts(note.path);

      // フォーカスモードでは、投稿後に基準日を「いま」に同期する。
      if (
        settingsState.viewNoteMode === "periodic" &&
        settingsState.displayMode === "focus"
      ) {
        settingsState.setDate(window.moment());
      }
    },
    [
      shell,
      settings,
      settingsState,
      editorState,
      noteState,
      store,
      refreshPosts,
    ],
  );

  // ── Public actions ─────────────────────────────────────────────────────────

  /** 新規投稿 / 編集の確定 */
  const handleSubmit = useCallback(async () => {
    if (!editorState.canSubmit(allPosts)) return;

    // タイムライン表示中は submit のたびに基準日を「いま」に同期する。
    // 意図: 日付跨ぎ直後は stale な日付のまま再検証されると、
    // DBに投稿があってもタイムライン範囲外となり UI が空表示になる。
    if (isTimelineView(settingsState.displayMode)) {
      settingsState.setDate(window.moment());
    }

    const currentInput = editorState.getInputValue();

    if (editorState.editingPost) return handleEditSubmit(currentInput);
    if (settingsState.threadFocusRootId)
      return handleThreadReplySubmit(currentInput);
    return handleNewPostSubmit(currentInput);
  }, [
    allPosts,
    editorState,
    settingsState,
    handleEditSubmit,
    handleThreadReplySubmit,
    handleNewPostSubmit,
  ]);

  /** 投稿を削除（削除フラグを付与して上書き） */
  const deletePost = useCallback(
    async (post: Post) => {
      const now = window.moment();

      if (isThreadRoot(post)) {
        const latestThreadPosts = await findLatestThreadPosts(post);
        if (latestThreadPosts.length === 0) {
          await notifyNotFoundAndRefresh(
            post.path,
            "スレッドの投稿を再特定できませんでした",
          );
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

      await replacePostAndRefresh(post, (prev) => ({
        ...prev,
        deleted: now.format("YYYYMMDDHHmmss"),
      }));
    },
    [
      replacePostAndRefresh,
      settingsState,
      findLatestThreadPosts,
      notifyNotFoundAndRefresh,
      updateManyPosts,
    ],
  );

  /** 投稿を恒久削除（ファイル中の該当エントリを完全に取り除く） */
  const permanentlyDeletePost = useCallback(
    async (post: Post) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
        return;
      }

      if (isThreadRoot(latestPost)) {
        const latestThreadPosts = await findLatestThreadPosts(latestPost);
        if (latestThreadPosts.length === 0) {
          await notifyNotFoundAndRefresh(
            post.path,
            "スレッドの投稿を再特定できませんでした",
          );
          return;
        }

        // オフセットズレ対策のため後ろから削除
        const sorted = latestThreadPosts
          .slice()
          .sort((a, b) => b.startOffset - a.startOffset);

        for (const p of sorted) {
          await shell.replaceRange(p.path, p.startOffset, p.endOffset, "");
        }

        const filePath = sorted[0]?.path;
        if (filePath) {
          await normalizeFileContent(filePath);
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
      await normalizeFileContent(latestPost.path);
      await refreshPosts(latestPost.path);
    },
    [
      shell,
      findLatestPost,
      findLatestThreadPosts,
      normalizeFileContent,
      notifyNotFoundAndRefresh,
      refreshPosts,
      settingsState,
    ],
  );

  /** 投稿をアーカイブ（アーカイブフラグを付与して上書き） */
  const archivePost = useCallback(
    async (post: Post) => {
      const now = window.moment();
      await replacePostAndRefresh(post, (prev) => ({
        ...prev,
        archived: now.format("YYYYMMDDHHmmss"),
      }));
    },
    [replacePostAndRefresh],
  );

  /** 投稿のタグを更新する */
  const setPostTags = useCallback(
    async (post: Post, rawInput: string) => {
      await replacePostAndRefresh(post, (metadata) => {
        const serializedTags = serializeMfdiTags(rawInput.split(","));
        if (serializedTags.length === 0) {
          const { [TAG_METADATA_KEY]: _removed, ...rest } = metadata;
          return rest;
        }
        return { ...metadata, [TAG_METADATA_KEY]: serializedTags };
      });
    },
    [replacePostAndRefresh],
  );

  /** 投稿のピン留め状態を更新する */
  const setPostPinned = useCallback(
    async (post: Post, pinned: boolean) => {
      await replacePostAndRefresh(post, (metadata) => {
        if (!pinned) {
          // 意図: 空文字を残すと「キーがあるので pinned 扱い」と再解釈されうるため、
          // 解除時はキーごと削除して保存形式を正規化する。
          const { [PINNED_METADATA_KEY]: _removed, ...rest } = metadata;
          return rest;
        }

        return { ...metadata, [PINNED_METADATA_KEY]: "1" };
      });
    },
    [replacePostAndRefresh],
  );

  /** 投稿を翌日へ移動 */
  const movePostToTomorrow = useCallback(
    async (post: Post) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
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
    [
      shell,
      settings,
      settingsState,
      findLatestPost,
      notifyNotFoundAndRefresh,
      deletePost,
      store,
    ],
  );

  /** ブロックIDリンクをクリップボードにコピーする */
  const copyBlockIdLink = useCallback(
    async (post: Post) => {
      let blockId = post.metadata.blockId;
      if (!blockId) {
        blockId = Math.random().toString(36).substring(2, 8);
        await replacePostAndRefresh(post, (prev) => ({ ...prev, blockId }));
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
    [shell, replacePostAndRefresh],
  );

  /** スレッドを作成する、または既存スレッドにフォーカスする */
  const createThread = useCallback(
    async (post: Post) => {
      // 既存スレッドのルート投稿をクリックした場合はフォーカスのみ
      if (post.threadRootId === post.id) {
        settingsState.setThreadFocusRootId(post.id, post.noteDate);
        return;
      }
      // 返信からはスレッド作成不可
      if (post.threadRootId && post.threadRootId !== post.id) {
        new Notice("返信からはスレッドを作成できません");
        return;
      }

      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
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

      cancelEditIfActive(latestPost);
      settingsState.setThreadFocusRootId(rootId, latestPost.noteDate);
      await refreshPosts(latestPost.path);
      new Notice("スレッドを作成しました");
    },
    [
      shell,
      settingsState,
      findLatestPost,
      getSerializedTimestamp,
      cancelEditIfActive,
      notifyNotFoundAndRefresh,
      refreshPosts,
    ],
  );

  /** 投稿を同じ MFDI タブの focused モードで開き、一覧上でハイライトする */
  const handleClickTime = useCallback(
    async (post: Post) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
        return;
      }

      // 意図: exact jump は MFDI 内の文脈を保ったまま対象日へ移動したいので、
      // 外部 leaf ではなく focused/day/all の状態へ寄せて一覧上の強調表示へ統一する。
      if (
        editorState.editingPost &&
        (editorState.editingPost.id !== latestPost.id ||
          editorState.editingPost.path !== latestPost.path)
      ) {
        editorState.cancelEdit();
      }

      settingsState.setAsTask(false);
      settingsState.setThreadOnly(false);
      settingsState.setActiveTag(null);
      settingsState.setSearchQuery("");
      settingsState.setTimeFilter("all");
      settingsState.setGranularity("day");
      settingsState.setDateFilter("today");
      settingsState.setDate(latestPost.noteDate.clone());
      settingsState.setDisplayMode(DISPLAY_MODE.FOCUS);
      editorState.setHighlightedPost(latestPost);
    },
    [editorState, findLatestPost, notifyNotFoundAndRefresh, settingsState],
  );

  return {
    handleSubmit,
    createThread,
    deletePost,
    permanentlyDeletePost,
    archivePost,
    setPostTags,
    setPostPinned,
    movePostToTomorrow,
    handleClickTime,
    copyBlockIdLink,
  };
};
