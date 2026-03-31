import type { FC } from "react";
import { useMemo } from "react";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isVisible } from "src/ui/utils/post-metadata";
import { countVisibleRootPosts } from "src/ui/utils/thread-utils";
import { isTimelineView } from "src/ui/utils/view-mode";
import { getFixedNoteTitle } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

export const ResultCount: FC = () => {
  const settings = useSettingsStore(
    useShallow((s) => ({
      granularity: s.granularity,
      asTask: s.asTask,
      dateFilter: s.dateFilter,
      timeFilter: s.timeFilter,
      displayMode: s.displayMode,
      threadFocusRootId: s.threadFocusRootId,
      viewNoteMode: s.viewNoteMode,
      fixedNotePath: s.fixedNotePath,
      activeTopic: s.activeTopic,
    })),
  );

  const { tasks } = usePostsStore(useShallow((s) => ({ tasks: s.tasks })));
  const { posts } = useUnifiedPosts();

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

  // タイムライン表示時はDBから総件数を取得する
  const db = useMFDIDB();
  const dbTotalCount = useMemo(
    () => db?.countMemos(activeTopic),
    [db, activeTopic],
  );

  // 「全体の件数」: タイムライン表示時はDB値、それ以外は表示中の投稿数
  const totalCount = useMemo(() => {
    if (isTimelineView(displayMode) && typeof dbTotalCount === "number") {
      return dbTotalCount;
    }
    const visiblePosts = posts.filter((p) => isVisible(p.metadata));
    return countVisibleRootPosts(visiblePosts);
  }, [posts, displayMode, dbTotalCount]);

  const currentCount = asTask
    ? tasks.length
    : countVisibleRootPosts(posts.filter((p) => isVisible(p.metadata)));

  // 固定ノートを表示中の場合は「N posts in <ノート名>」形式
  if (viewNoteMode === "fixed") {
    const noteTitle = getFixedNoteTitle(fixedNotePath);
    return (
      <>
        {asTask
          ? `${currentCount} tasks in ${noteTitle}`
          : `${currentCount} posts in ${noteTitle}`}
      </>
    );
  }

  // 「今日・時間帯フィルターあり」または「タイムライン表示」のときは総件数も併記する
  const isDailyTimeFiltered =
    dateFilter === "today" && timeFilter !== "all" && granularity === "day";
  const showTotal = isDailyTimeFiltered || isTimelineView(displayMode);

  const totalSuffix = showTotal ? `/${totalCount}` : "";
  return (
    <>
      {asTask ? `${currentCount} tasks` : `${currentCount}${totalSuffix} posts`}
    </>
  );
};
