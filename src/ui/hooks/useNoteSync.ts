import { TFile } from "obsidian";
import { useEffect } from "react";
import { useAppContext } from "src/ui/context/AppContext";
import { noteStore, useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { Granularity, MomentLike } from "src/ui/types";
import { getPeriodicSettings } from "src/utils/daily-notes";
import { useShallow } from "zustand/shallow";
import { useRefreshPosts } from "./internal/useRefreshPosts";

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
  const refreshPosts = useRefreshPosts();

  const { date, granularity, activeTopic, dateFilter, displayMode, setDate } =
    useSettingsStore(
      useShallow((s) => ({
        date: s.date,
        granularity: s.granularity,
        activeTopic: s.activeTopic,
        dateFilter: s.dateFilter,
        displayMode: s.displayMode,
        setDate: s.setDate,
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

  useEffect(() => {
    const isMultiDayOrTimeline =
      dateFilter !== "today" || displayMode === "timeline";

    const handleChanged = async (file: TFile) => {
      if (isMultiDayOrTimeline) {
        if (displayMode === "timeline" || weekNotePaths.has(file.path)) {
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

      noteStore.getState().updateCurrentDailyNote(app);
      await Promise.all([updatePosts(file), updateTasks(file)]);
    };

    const handleDelete = async (file: { path: string }) => {
      if (displayMode === "timeline" || weekNotePaths.has(file.path)) {
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
    currentDailyNote,
    weekNotePaths,
    setTasks,
    setPosts,
    updatePosts,
    updateTasks,
    refreshPosts,
  ]);
}
