import { useLiveQuery } from "dexie-react-hooks";
import type { FC } from "react";
import { useMemo } from "react";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isArchived, isDeleted } from "src/ui/utils/post-metadata";
import { countVisibleRootPosts } from "src/ui/utils/thread-utils";
import { isTimelineView } from "src/ui/utils/view-mode";
import { getFixedNoteTitle } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

// ---- ヘルパー関数 ----

const formatCount = (count: number, total: string, asTask: boolean): string =>
  asTask ? `${count} tasks` : `${count}${total} posts`;

const formatFixedCount = (
  count: number,
  noteTitle: string,
  asTask: boolean,
): string =>
  asTask ? `${count} tasks in ${noteTitle}` : `${count} posts in ${noteTitle}`;

// ---- カスタムフック ----

const useResultCountState = () => {
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
  const postsState = usePostsStore(
    useShallow((s) => ({ posts: s.posts, tasks: s.tasks })),
  );
  return { settings, postsState };
};

// ---- コンポーネント ----

export const ResultCount: FC = () => {
  const { settings, postsState } = useResultCountState();
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
  const { posts, tasks } = postsState;

  const filteredPosts = useFilteredPosts({ posts, ...settings });

  const db = useMFDIDB();
  const dbTotalCount = useLiveQuery(
    () => (db ? db.countMemos(activeTopic) : undefined),
    [db, activeTopic],
  );

  const allPostsCount = useMemo(() => {
    if (isTimelineView(displayMode) && typeof dbTotalCount === "number") {
      return dbTotalCount;
    }
    const visiblePosts = posts.filter(
      (post) => !isArchived(post.metadata) && !isDeleted(post.metadata),
    );
    return countVisibleRootPosts(visiblePosts);
  }, [posts, displayMode, dbTotalCount]);

  // ---- 表示ロジック ----

  const displayCount = asTask ? tasks.length : filteredPosts.length;

  const isDailyTimeFiltered =
    dateFilter === "today" && timeFilter !== "all" && granularity === "day";
  const shouldShowTotal = isDailyTimeFiltered || isTimelineView(displayMode);
  const totalPart = shouldShowTotal ? `/${allPostsCount}` : "";

  if (viewNoteMode === "fixed") {
    return (
      <>
        {formatFixedCount(
          displayCount,
          getFixedNoteTitle(fixedNotePath),
          asTask,
        )}
      </>
    );
  }

  return <>{formatCount(displayCount, totalPart, asTask)}</>;
};
