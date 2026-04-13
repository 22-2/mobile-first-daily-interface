import type { FC } from "react";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { usePostsStore } from "src/ui/store/postsStore";
import { isTimelineView } from "src/ui/utils/view-mode";
import { getFixedNoteTitle } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";
import {
  formatFixedNoteLabel,
  formatLabel,
  getVisibleRootCount,
} from "src/ui/components/statusbar/parts/helper";
import { useDbTotalCount, useSettings, useTotalCount } from "src/ui/components/statusbar/parts/hooks";

export const ResultCount: FC = () => {
  const settings = useSettings();
  const {
    granularity,
    asTask,
    dateFilter,
    timeFilter,
    displayMode,
    viewNoteMode,
    fixedNotePath,
    activeTopic,
  } = settings;

  const { tasks } = usePostsStore(useShallow((s) => ({ tasks: s.tasks })));
  const { posts } = useUnifiedPosts();

  const dbTotalCount = useDbTotalCount(activeTopic);
  const totalCount = useTotalCount(displayMode, dbTotalCount, posts);

  const currentCount = asTask ? tasks.length : getVisibleRootCount(posts);

  if (viewNoteMode === "fixed") {
    const noteTitle = getFixedNoteTitle(fixedNotePath);
    return <>{formatFixedNoteLabel(currentCount, noteTitle, asTask)}</>;
  }

  const isDailyTimeFiltered =
    dateFilter === "today" && timeFilter !== "all" && granularity === "day";
  const showTotal = isDailyTimeFiltered || isTimelineView(displayMode);
  const totalSuffix = showTotal ? `/${totalCount}` : "";

  return <>{formatLabel(currentCount, totalSuffix, asTask)}</>;
};
