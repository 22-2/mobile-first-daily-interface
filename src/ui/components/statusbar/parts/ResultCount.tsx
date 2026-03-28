import { useLiveQuery } from "dexie-react-hooks";
import type { FC } from "react";
import { useMemo } from "react";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useInfiniteTimeline } from "src/ui/hooks/internal/useInfiniteTimeline";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isArchived, isDeleted } from "src/ui/utils/post-metadata";
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

  const { posts, tasks } = usePostsStore(
    useShallow((s) => ({ posts: s.posts, tasks: s.tasks })),
  );

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

  const filteredPosts = useFilteredPosts({ posts, ...settings });

  // タイムライン表示時はDBから総件数を取得する
  const db = useMFDIDB();
  const dbTotalCount = useLiveQuery(
    () => db?.countMemos(activeTopic),
    [db, activeTopic],
  );

  // 「全体の件数」: タイムライン表示時はDB値、それ以外は表示中の投稿数
  const totalCount = useMemo(() => {
    if (isTimelineView(displayMode) && typeof dbTotalCount === "number") {
      return dbTotalCount;
    }
    const visiblePosts = posts.filter(
      (p) => !isArchived(p.metadata) && !isDeleted(p.metadata),
    );
    return countVisibleRootPosts(visiblePosts);
  }, [posts, displayMode, dbTotalCount]);

  // タイムライン表示時はページネーションで読み込まれた投稿は`useInfiniteTimeline().allPosts`に入る。
  // そのため現在件数は以下の優先順位で決定する:
  // - タスクモード: タスク数
  // - タイムライン表示: allPosts のうちアーカイブ/削除を除いたルート投稿数
  // - それ以外: フィルター後の投稿数
  const { allPosts } = useInfiniteTimeline();

  const currentCount = asTask
    ? tasks.length
    : isTimelineView(displayMode)
    ? countVisibleRootPosts(
        allPosts.filter((p) => !isArchived(p.metadata) && !isDeleted(p.metadata)),
      )
    : filteredPosts.length;

  // 固定ノートを表示中の場合は「N posts in <ノート名>」形式
  if (viewNoteMode === "fixed") {
    const noteTitle = getFixedNoteTitle(fixedNotePath);
    return <>{asTask ? `${currentCount} tasks in ${noteTitle}` : `${currentCount} posts in ${noteTitle}`}</>;
  }

  // 「今日・時間帯フィルターあり」または「タイムライン表示」のときは総件数も併記する
  const isDailyTimeFiltered =
    dateFilter === "today" && timeFilter !== "all" && granularity === "day";
  const showTotal = isDailyTimeFiltered || isTimelineView(displayMode);

  const totalSuffix = showTotal ? `/${totalCount}` : "";
  return <>{asTask ? `${currentCount} tasks` : `${currentCount}${totalSuffix} posts`}</>;
};
