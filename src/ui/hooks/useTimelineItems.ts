import { useMemo } from "react";
import {
    DateFilter,
    DisplayMode,
    Granularity,
    MomentLike,
    Post
} from "src/ui/types";

export type TimelineItem =
  | { type: "post"; post: Post; key: string }
  | { type: "divider"; date: MomentLike; key: string };

export const useTimelineItems = (
  filteredPosts: Post[],
  editingPostOffset: number | null,
  granularity: Granularity,
  displayMode: DisplayMode,
  dateFilter: DateFilter,
) => {
  return useMemo(() => {
    const list: TimelineItem[] = [];
    let lastDate: string | null = null;

    const posts = filteredPosts.filter(
      (x) => x.startOffset !== editingPostOffset,
    );

    posts.forEach((post) => {
      const currentDate = post.timestamp.format("YYYY-MM-DD");

      // タイムラインモードなら常に区分けを出す。フォーカスモード（単一閲覧）なら今日以外のみ。
      const shouldShowDividers =
        displayMode === "timeline" ||
        granularity !== "day" ||
        dateFilter !== "today";
      const isDateChanged = lastDate !== currentDate;
      const isFirstItem = lastDate === null;
      const isDateInPast = post.timestamp.isBefore(new Date(), "day");

      const showDivider =
        shouldShowDividers &&
        isDateChanged &&
        (!isFirstItem || isDateInPast);

      if (showDivider) {
        list.push({
          type: "divider",
          date: post.timestamp,
          key: `divider-${currentDate}`,
        });
      }
      list.push({
        type: "post",
        post,
        key: `post-${post.timestamp.valueOf()}-${post.offset}`,
      });
      lastDate = currentDate;
    });

    return list;
  }, [filteredPosts, editingPostOffset, granularity, dateFilter, displayMode]);
};
