import { useMemo } from "react";
import { Post, DateFilter, TimeFilter, Granularity, DisplayMode } from "../types";

interface UseFilteredPostsProps {
  posts: Post[];
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  asTask: boolean;
  granularity: Granularity;
  displayMode: DisplayMode;
}

export const useFilteredPosts = ({
  posts,
  timeFilter,
  dateFilter,
  asTask,
  granularity,
  displayMode,
}: UseFilteredPostsProps) => {
  return useMemo(() => {
    const postsWithoutHidden = posts.filter(
      (p) => !p.metadata.archived && !p.metadata.deleted,
    );

    // タイムラインモード時は一切のフィルタ（期間、時間等）を無視して全件表示
    if (displayMode === "timeline") return postsWithoutHidden;

    if (dateFilter !== "today") return postsWithoutHidden;
    if (timeFilter === "all" || asTask || granularity !== "day")
      return postsWithoutHidden;
    if (timeFilter === "latest")
      return postsWithoutHidden.length > 0 ? [postsWithoutHidden[0]] : [];

    // "1h", "2h" などの文字列から数値を抽出
    const hours = parseInt(timeFilter as string);
    if (isNaN(hours)) return postsWithoutHidden;

    const now = window.moment();
    return postsWithoutHidden.filter((p) => now.diff(p.timestamp, "hours") < hours);
  }, [posts, timeFilter, dateFilter, asTask, granularity, displayMode]);
};
