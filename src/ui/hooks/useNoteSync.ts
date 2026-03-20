import { useQueryClient } from "@tanstack/react-query";
import { TFile } from "obsidian";
import { useCallback, useEffect } from "react";
import { useAppContext } from "src/ui/context/AppContext";
import { useCurrentAppStore } from "src/ui/store/appStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { Granularity, MomentLike } from "src/ui/types";
import { isTimelineView } from "src/ui/utils/view-mode";
import { getPeriodicSettings } from "src/utils/daily-notes";
import { normalizeFixedNotePath } from "src/utils/fixed-note";
import { useShallow } from "zustand/shallow";
import { createRefreshPosts } from "./internal/refreshPosts";

type CurrentDayFileParams = {
  date: MomentLike;
  granularity: Granularity;
  activeTopic: string | null;
};

function isCurrentDayFile(
  filePath: string,
  { date, granularity, activeTopic }: CurrentDayFileParams,
): boolean {
  const ds = getPeriodicSettings(granularity);
  const dir = ds.folder ? `${ds.folder}/` : "";
  const prefix = activeTopic ? `${activeTopic}-` : "";
  const entry = date.format(ds.format ?? "YYYY-MM-DD");
  return filePath === `${dir}${prefix}${entry}.md`;
}

/**
 * ファイルの変更・削除イベントを監視し、ノートの内容をReactの状態と自動同期するHook。
 */
export function useNoteSync() {
  const { app } = useAppContext();
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
      vault: app.vault,
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
      app.vault,
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
    const isMultiDayOrTimeline =
      dateFilter !== "today" || isTimelineView(displayMode);

    const handleChanged = async (file: TFile) => {
      if (viewNoteMode === "fixed") {
        const targetPath =
          currentDailyNote?.path ?? normalizeFixedNotePath(fixedNotePath ?? "");
        if (!targetPath || file.path !== targetPath) return;

        store.getState().updateCurrentDailyNote(app);
        await Promise.all([updatePosts(file), updateTasks(file)]);
        return;
      }

      if (isMultiDayOrTimeline) {
        if (isTimelineView(displayMode) || weekNotePaths.has(file.path)) {
          await refreshPosts(file.path);
        }
        return;
      }

      // 通常モード: 対象ファイルかどうかチェック
      if (currentDailyNote != null && file.path !== currentDailyNote.path)
        return;
      if (
        currentDailyNote == null &&
        !isCurrentDayFile(file.path, { date, granularity, activeTopic })
      )
        return;

      store.getState().updateCurrentDailyNote(app);
      await Promise.all([updatePosts(file), updateTasks(file)]);
    };

    const handleDelete = async (file: { path: string }) => {
      if (viewNoteMode === "fixed") {
        const targetPath =
          currentDailyNote?.path ?? normalizeFixedNotePath(fixedNotePath ?? "");
        if (file.path !== targetPath) return;
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

    const changedRef = app.metadataCache.on("changed", handleChanged);
    const deleteRef = app.vault.on("delete", handleDelete);
    const createRef = app.vault.on("create", (file) => {
      if (file instanceof TFile) handleChanged(file);
    });

    return () => {
      app.metadataCache.offref(changedRef);
      app.vault.offref(deleteRef);
      app.vault.offref(createRef);
    };
  }, [
    app,
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
