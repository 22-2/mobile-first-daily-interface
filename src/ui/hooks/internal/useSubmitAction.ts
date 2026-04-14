import { Notice, TFile } from "obsidian";
import { useCallback } from "react";
import { resolveNoteSource } from "src/core/note-source";
import { toText } from "src/core/post-utils";
import { useAppContext } from "src/ui/context/AppContext";
import { useEditorRefs } from "src/ui/context/EditorRefsContext";
import { usePostHelpers } from "src/ui/hooks/internal/usePostHelpers";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { useCurrentAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { THREAD_METADATA_KEYS } from "src/ui/utils/thread-utils";
import { isTimelineView } from "src/ui/utils/view-mode";
import { useShallow } from "zustand/shallow";

/** 新規投稿・編集確定のみを担う hook。InputArea / InputAreaFooter / ReactView が利用する。 */
export const useSubmitAction = () => {
  const { shell, settings } = useAppContext();
  const store = useCurrentAppStore();

  const settingsState = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      granularity: s.granularity,
      activeTopic: s.activeTopic,
      asTask: s.asTask,
      threadFocusRootId: s.threadFocusRootId,
      viewNoteMode: s.viewNoteMode,
      displayMode: s.displayMode,
      getEffectiveDate: s.getEffectiveDate,
      setDate: s.setDate,
      setThreadFocusRootId: s.setThreadFocusRootId,
    })),
  );

  const { posts: allPosts } = useUnifiedPosts();

  const editorState = useEditorStore(
    useShallow((s) => ({
      getInputValue: s.getInputValue,
      clearInput: s.clearInput,
      editingPost: s.editingPost,
      canSubmit: s.canSubmit,
      cancelEdit: s.cancelEdit,
    })),
  );

  const { scrollContainerRef } = useEditorRefs();

  const noteState = useNoteStore(
    useShallow((s) => ({ currentDailyNote: s.currentDailyNote })),
  );

  const {
    refreshPosts,
    getSerializedTimestamp,
    notifyNotFoundAndRefresh,
    findLatestPost,
  } = usePostHelpers();

  // ── Sub-handlers ───────────────────────────────────────────────────────────

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
      scrollContainerRef.current?.scrollTo({ top: 0 });
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

  // ── Public action ──────────────────────────────────────────────────────────

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

  return { handleSubmit };
};
