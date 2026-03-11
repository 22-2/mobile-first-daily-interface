import { useQueryClient } from "@tanstack/react-query";
import { TFile } from "obsidian";
import { useEffect } from "react";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { noteStore, useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { getPeriodicSettings } from "src/utils/daily-notes";
import { useShallow } from "zustand/shallow";

/**
 * ファイルの変更・削除イベントを監視し、ノートの内容をReactの状態と自動同期するHook。
 */
export function useNoteSync() {
  const { app } = useAppContext();
  const queryClient = useQueryClient();

  const settingsState = useSettingsStore(useShallow(s => ({
    date: s.date,
    granularity: s.granularity,
    activeTopic: s.activeTopic,
    dateFilter: s.dateFilter,
    displayMode: s.displayMode,
    setDate: s.setDate,
  })));

  const noteState = useNoteStore(useShallow(s => ({
    currentDailyNote: s.currentDailyNote,
    weekNotePaths: s.weekNotePaths,
    replacePaths: s.replacePaths,
  })));

  const postsState = usePostsStore(useShallow(s => ({
    setTasks: s.setTasks,
    setPosts: s.setPosts,
    updatePosts: s.updatePosts,
    updateTasks: s.updateTasks,
    updatePostsForWeek: s.updatePostsForWeek,
    updatePostsForDays: s.updatePostsForDays,
  })));

  useEffect(() => {
    const { date, granularity, activeTopic, dateFilter, displayMode } = settingsState;
    const { currentDailyNote, weekNotePaths } = noteState;

    const eventRef = app.metadataCache.on("changed", async (file) => {
      // タイムラインモード: TQ キャッシュを invalidate して再フェッチを促す
      if (displayMode === DISPLAY_MODE.TIMELINE) {
        queryClient.invalidateQueries({ queryKey: ["posts", activeTopic, displayMode] });
        return;
      }

      // 複数日表示モード
      if (dateFilter !== "today" && weekNotePaths.size > 0) {
        if (weekNotePaths.has(file.path)) {
          if (dateFilter === "this_week") {
            postsState.updatePostsForWeek(activeTopic, date).then(paths => noteState.replacePaths(paths));
          } else {
            const days = parseInt(dateFilter);
            if (!isNaN(days)) {
              postsState.updatePostsForDays(activeTopic, date, days).then(({ paths }) => noteState.replacePaths(paths));
            }
          }
        }
        return;
      }

      // 通常モード
      if (currentDailyNote != null && file.path !== currentDailyNote.path) return;

      if (currentDailyNote == null) {
        const ds = getPeriodicSettings(granularity);
        const dir = ds.folder ? `${ds.folder}/` : "";
        const prefix = activeTopic ? `${activeTopic}-` : "";
        const entry = date.format(ds.format ?? "YYYY-MM-DD");
        if (file.path !== `${dir}${prefix}${entry}.md`) return;
      }

      noteStore.getState().updateCurrentDailyNote(app);
      if (file instanceof TFile) {
        await Promise.all([postsState.updatePosts(file), postsState.updateTasks(file)]);
      }
    });

    const deleteEventRef = app.vault.on("delete", async (file) => {
      if (file.path !== currentDailyNote?.path) return;
      settingsState.setDate(date.clone());
      postsState.setTasks([]);
      postsState.setPosts([]);
    });

    return () => {
      app.metadataCache.offref(eventRef);
      app.vault.offref(deleteEventRef);
    };
  }, [app, queryClient, settingsState, noteState, postsState]);
}
