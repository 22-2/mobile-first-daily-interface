import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "src/ui/context/AppContext";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { settingsStore, useSettingsStore } from "src/ui/store/settingsStore";
import { isTimelineView } from "src/ui/utils/view-mode";
import { useShallow } from "zustand/shallow";
import {
  createTimelinePageFetcher,
  resolveTimelineBaseDate,
  resolveTimelineCacheBucket,
  TimelinePostsPage,
  TIMELINE_CACHE_INVALIDATE_MS
} from "./timelinePosts";

const PAGE_SIZE_DAYS = 14;

/**
 * タイムラインモード（無限スクロール）のデータ取得と管理を担当するHook。
 */
export const useInfiniteTimeline = () => {
  const { shell, appHelper } = useAppContext();
  const [cacheBucket, setCacheBucket] = useState(() =>
    resolveTimelineCacheBucket(),
  );

  const { activeTopic, displayMode, date } = useSettingsStore(
    useShallow((s) => ({
      activeTopic: s.activeTopic,
      displayMode: s.displayMode,
      date: s.date,
    })),
  );
  const timelineDayKey = date.format("YYYY-MM-DD");

  const { setPosts } = usePostsStore(
    useShallow((s) => ({ setPosts: s.setPosts })),
  );
  const { addPaths } = useNoteStore(
    useShallow((s) => ({ addPaths: s.addPaths })),
  );
  const fetchPage = useCallback(
    createTimelinePageFetcher({
      shell,
      // Timeline should prioritize freshness over cached reads around midnight/file-create timing.
      readFile: (file) => appHelper.loadFile(file.path),
    }),
    [shell, appHelper],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = settingsStore.getState();
      if (isTimelineView(state.displayMode)) {
        const now = window.moment();
        if (!state.date.isSame(now, "day")) {
          state.setDate(now);
        }
      }

      const nextBucket = resolveTimelineCacheBucket();
      setCacheBucket((current) =>
        current === nextBucket ? current : nextBucket,
      );
    }, 30 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 無限クエリ
  // ---------------------------------------------------------------------------
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<
    TimelinePostsPage,
    Error,
    { pages: TimelinePostsPage[]; pageParams: (string | null)[] },
    string[],
    string | null
  >({
    queryKey: [
      "posts",
      activeTopic,
      displayMode,
      String(cacheBucket),
      timelineDayKey,
    ],
    enabled: isTimelineView(displayMode),
    initialPageParam: null,

    queryFn: async ({ pageParam }) => {
      const baseDate = resolveTimelineBaseDate(
        pageParam,
        settingsStore.getState().getEffectiveDate,
      );
      const result = await fetchPage(activeTopic, baseDate, PAGE_SIZE_DAYS);
      addPaths(result.paths);
      return result;
    },

    getNextPageParam: (lastPage) =>
      lastPage.hasMore
        ? lastPage.lastSearchedDate.clone().subtract(1, "day").format()
        : undefined,
  });

  // ---------------------------------------------------------------------------
  // ページデータを postsStore に同期
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isTimelineView(displayMode) && infiniteData) {
      setPosts(infiniteData.pages.flatMap((p) => p.posts));
    }
  }, [displayMode, infiniteData, setPosts]);

  // ---------------------------------------------------------------------------
  // 次ページ読み込みトリガー
  // ---------------------------------------------------------------------------
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { loadMore, hasMore: hasNextPage, isFetchingNextPage };
};

export { TIMELINE_CACHE_INVALIDATE_MS, resolveTimelineCacheBucket };
