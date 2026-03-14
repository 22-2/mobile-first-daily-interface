import { useEffect } from "react";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

/**
 * 複数日表示モードにおけるデータの読み込みと監視パスの同期を行う副作用Hook。
 */
export function useMultiDaySync() {
  const settingsState = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      dateFilter: s.dateFilter,
      granularity: s.granularity,
      asTask: s.asTask,
      activeTopic: s.activeTopic,
    })),
  );

  const postsState = usePostsStore(
    useShallow((s) => ({
      updatePostsForWeek: s.updatePostsForWeek,
      updatePostsForDays: s.updatePostsForDays,
    })),
  );

  const noteState = useNoteStore(
    useShallow((s) => ({
      replacePaths: s.replacePaths,
    })),
  );

  useEffect(() => {
    const { date, dateFilter, granularity, asTask, activeTopic } =
      settingsState;
    if (granularity !== "day" || asTask) return;

    if (dateFilter === "this_week") {
      postsState.updatePostsForWeek(activeTopic, date).then((paths) => {
        noteState.replacePaths(paths);
      });
    } else if (["3d", "5d", "7d"].includes(dateFilter)) {
      const days = parseInt(dateFilter);
      if (!isNaN(days)) {
        postsState
          .updatePostsForDays(activeTopic, date, days)
          .then(({ paths }) => {
            noteState.replacePaths(paths);
          });
      }
    }
  }, [settingsState, postsState, noteState]);
}
