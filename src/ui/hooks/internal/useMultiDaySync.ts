import { useEffect } from "react";
import { DateFilter, Granularity, MomentLike } from "src/ui/types";

interface UseMultiDaySyncProps {
  date: MomentLike;
  dateFilter: DateFilter;
  granularity: Granularity;
  asTask: boolean;
  activeTopic: string;
  updatePostsForWeek: (topicId: string) => Promise<Set<string>>;
  updatePostsForDays: (
    topicId: string,
    days: number,
  ) => Promise<{ paths: Set<string> }>;
  replacePaths: (paths: Set<string>) => void;
}

/**
 * 複数日（週表示、3日表示など）モードにおけるデータの読み込みと、
 * 監視対象パスの更新を同期する副作用Hook。
 */
export function useMultiDaySync({
  date,
  dateFilter,
  granularity,
  asTask,
  activeTopic,
  updatePostsForWeek,
  updatePostsForDays,
  replacePaths,
}: UseMultiDaySyncProps) {
  useEffect(() => {
    if (granularity !== "day" || asTask) return;

    if (dateFilter === "this_week") {
      updatePostsForWeek(activeTopic).then((paths) => {
        replacePaths(paths);
      });
    } else if (["3d", "5d", "7d"].includes(dateFilter)) {
      const days = parseInt(dateFilter);
      if (!isNaN(days)) {
        updatePostsForDays(activeTopic, days).then(({ paths }) => {
          replacePaths(paths);
        });
      }
    }
  }, [
    date,
    dateFilter,
    granularity,
    asTask,
    activeTopic,
    updatePostsForWeek,
    updatePostsForDays,
    replacePaths,
  ]);
}
