import { useMemo } from "react";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import {
    DateFilter,
    DisplayMode,
    Granularity,
    Post,
    TimeFilter
} from "src/ui/types";
import {
  countVisibleRootPosts,
  getThreadPosts,
  isVisibleRootPost,
  sortThreadPosts,
} from "src/ui/utils/thread-utils";

interface UseFilteredPostsProps {
  posts: Post[];
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  asTask: boolean;
  granularity: Granularity;
  displayMode: DisplayMode;
  threadFocusRootId: string | null;
  includeThreadReplies?: boolean;
}

export const useFilteredPosts = ({
  posts,
  timeFilter,
  dateFilter,
  asTask,
  granularity,
  displayMode,
  threadFocusRootId,
  includeThreadReplies = false,
}: UseFilteredPostsProps) => {
  return useMemo(() => {
    const postsWithoutHidden = posts.filter(
      (p) => !p.metadata.archived && !p.metadata.deleted,
    );

    if (threadFocusRootId) {
      const threadPosts = sortThreadPosts(
        getThreadPosts(postsWithoutHidden, threadFocusRootId),
        threadFocusRootId,
      );
      return includeThreadReplies
        ? threadPosts
        : threadPosts.filter(isVisibleRootPost);
    }

    const visibleRoots = postsWithoutHidden.filter(isVisibleRootPost);

    // タイムラインモード時は一切のフィルタ（期間、時間等）を無視して全件表示
    if (displayMode === DISPLAY_MODE.TIMELINE) return visibleRoots;

    if (dateFilter !== "today") return visibleRoots;
    if (timeFilter === "all" || asTask || granularity !== "day")
      return visibleRoots;
    if (timeFilter === "latest")
      return visibleRoots.length > 0 ? [visibleRoots[0]] : [];

    // "1h", "2h" などの文字列から数値を抽出
    const hours = parseInt(timeFilter as string);
    if (isNaN(hours)) return visibleRoots;

    const now = window.moment();
    return visibleRoots.filter(
      (p) => now.diff(p.timestamp, "hours") < hours,
    );
  }, [
    posts,
    timeFilter,
    dateFilter,
    asTask,
    granularity,
    displayMode,
    threadFocusRootId,
    includeThreadReplies,
  ]);
};

export { countVisibleRootPosts };
