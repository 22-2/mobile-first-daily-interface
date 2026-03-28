import { useQueryClient } from "@tanstack/react-query";
import { TFile } from "obsidian";
import { useCallback, useEffect } from "react";
import { resolveNoteSource } from "src/core/note-source";
import { useAppStore, useCurrentAppStore } from "src/ui/store/appStore";
import { createRefreshPosts } from "src/ui/hooks/internal/refreshPosts";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isTimelineView } from "src/ui/utils/view-mode";
import { useShallow } from "zustand/shallow";

/**
 * ファイルの変更・削除イベントを監視し、ノートの内容をReactの状態と自動同期するHook。
 */
export function useNoteSync() {
  const shell = useAppStore((s) => s.shell);
  const store = useCurrentAppStore();
  const queryClient = useQueryClient();

  const { date, granularity, activeTopic, dateFilter, displayMode, setDate } =
    useSettingsStore(
      useShallow((s) => ({
        date: s.date,
        granularity: s.granularity,
        activeTopic: s.activeTopic,
        dateFilter: s.dateFilter,
        displayMode: s.displayMode,
        setDate: s.setDate,
        viewNoteMode: s.viewNoteMode,
        fixedNotePath: s.fixedNotePath,
      })),
    );

  const { viewNoteMode, fixedNotePath } = useSettingsStore(
    useShallow((s) => ({
      viewNoteMode: s.viewNoteMode,
      fixedNotePath: s.fixedNotePath,
    })),
  );

  const { currentDailyNote, weekNotePaths } = useNoteStore(
    useShallow((s) => ({
      currentDailyNote: s.currentDailyNote,
      weekNotePaths: s.weekNotePaths,
    })),
  );

  const { setTasks, setPosts, updatePosts, updateTasks } = usePostsStore(
    useShallow((s) => ({
      setTasks: s.setTasks,
      setPosts: s.setPosts,
      updatePosts: s.updatePosts,
      updateTasks: s.updateTasks,
    })),
  );

  const refreshPosts = useCallback(
    createRefreshPosts({
      vault: shell!.getVault(),
      queryClient,
      dateFilter,
      activeTopic,
      date,
      displayMode,
      updatePosts,
      updatePostsForWeek: store.getState().updatePostsForWeek,
      updatePostsForDays: store.getState().updatePostsForDays,
      replacePaths: store.getState().replacePaths,
    }),
    [
      shell,
      store,
      queryClient,
      dateFilter,
      activeTopic,
      date,
      displayMode,
      updatePosts,
    ],
  );

  useEffect(() => {
    if (!shell) return;
    const isMultiDayOrTimeline =
      dateFilter !== "today" || isTimelineView(displayMode);
    const noteSource = resolveNoteSource({
      shell,
      date,
      granularity,
      activeTopic,
      noteMode: viewNoteMode,
      fixedNotePath,
    });

    const handleChanged = async (file: TFile) => {
      if (noteSource.mode === "periodic" && isMultiDayOrTimeline) {
        if (isTimelineView(displayMode) || weekNotePaths.has(file.path)) {
          await refreshPosts(file.path);
        }
        return;
      }

      if (!noteSource.matchesPath(file.path, currentDailyNote)) return;

      store.getState().updateCurrentDailyNote(shell);
      await Promise.all([updatePosts(file), updateTasks(file)]);
    };

    const handleDelete = async (file: { path: string }) => {
      if (noteSource.mode === "fixed") {
        if (!noteSource.matchesPath(file.path, currentDailyNote)) return;
        store.getState().setCurrentDailyNote(null);
        setTasks([]);
        setPosts([]);
        return;
      }

      if (isTimelineView(displayMode) || weekNotePaths.has(file.path)) {
        await refreshPosts(file.path);
      }

      if (file.path !== currentDailyNote?.path) return;
      setDate(date.clone());
      setTasks([]);
      setPosts([]);
    };

    const changedRef = shell.getMetadataCache().on("changed", handleChanged);
    const deleteRef = shell.getVault().on("delete", handleDelete);
    const createRef = shell.getVault().on("create", (file) => {
      if (file instanceof TFile) handleChanged(file);
    });

    return () => {
      shell.getMetadataCache().offref(changedRef);
      shell.getVault().offref(deleteRef);
      shell.getVault().offref(createRef);
    };
  }, [
    shell,
    date,
    granularity,
    activeTopic,
    dateFilter,
    displayMode,
    setDate,
    viewNoteMode,
    fixedNotePath,
    currentDailyNote,
    weekNotePaths,
    setTasks,
    setPosts,
    updatePosts,
    updateTasks,
    refreshPosts,
    store,
  ]);
}
