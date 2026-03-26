import { useMemo } from "react";
import type {
  DateFilter,
  DisplayMode,
  Granularity,
  Post,
  TimeFilter,
} from "src/ui/types";
import { filterPostsByRelativeWindow } from "src/ui/utils/post-filters";
import { getPostTags, isArchived, isDeleted } from "src/ui/utils/post-metadata";
import {
  countVisibleRootPosts,
  getThreadPosts,
  isVisibleRootPost,
  sortThreadPosts,
} from "src/ui/utils/thread-utils";
import { isThreadView, isTimelineView } from "src/ui/utils/view-mode";
import type { MFDINoteMode } from "src/ui/view/state";

interface UseFilteredPostsProps {
  posts: Post[];
  activeTag?: string | null;
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  asTask: boolean;
  granularity: Granularity;
  displayMode: DisplayMode;
  threadFocusRootId: string | null;
  viewNoteMode?: MFDINoteMode;
  includeThreadReplies?: boolean;
}

export const useFilteredPosts = ({
  posts,
  activeTag = null,
  timeFilter,
  dateFilter,
  asTask,
  granularity,
  displayMode,
  threadFocusRootId,
  viewNoteMode = "periodic",
  includeThreadReplies = false,
}: UseFilteredPostsProps) => {
  return useMemo(() => {
    const postsWithoutHidden = posts.filter(
      (p) => !isArchived(p.metadata) && !isDeleted(p.metadata),
    );
    const effectiveActiveTag = viewNoteMode === "fixed" ? null : activeTag;
    const postsMatchingTag =
      effectiveActiveTag == null
        ? postsWithoutHidden
        : postsWithoutHidden.filter((post) =>
            getPostTags(post.metadata).includes(effectiveActiveTag),
          );
    const activeThreadRootId = threadFocusRootId;

    if (
      activeThreadRootId &&
      isThreadView({ displayMode, threadFocusRootId: activeThreadRootId })
    ) {
      const threadPosts = sortThreadPosts(
        getThreadPosts(postsMatchingTag, activeThreadRootId),
        activeThreadRootId,
      );
      return includeThreadReplies
        ? threadPosts
        : threadPosts.filter(isVisibleRootPost);
    }

    const visibleRoots = postsMatchingTag.filter(isVisibleRootPost);

    if (viewNoteMode === "fixed") {
      return filterPostsByRelativeWindow(visibleRoots, {
        dateFilter,
        timeFilter,
        asTask,
        granularity,
      });
    }

    // タイムラインモード時は一切のフィルタ（期間、時間等）を無視して全件表示
    if (isTimelineView(displayMode)) return visibleRoots;

    if (dateFilter !== "today") return visibleRoots;
    if (timeFilter === "all" || asTask || granularity !== "day")
      return visibleRoots;
    if (timeFilter === "latest")
      return visibleRoots.length > 0 ? [visibleRoots[0]] : [];

    // "1h", "2h" などの文字列から数値を抽出
    const hours = parseInt(timeFilter as string);
    if (isNaN(hours)) return visibleRoots;

    const now = window.moment();
    return visibleRoots.filter((p) => now.diff(p.timestamp, "hours") < hours);
  }, [
    posts,
    activeTag,
    timeFilter,
    dateFilter,
    asTask,
    granularity,
    displayMode,
    threadFocusRootId,
    viewNoteMode,
    includeThreadReplies,
  ]);
};
