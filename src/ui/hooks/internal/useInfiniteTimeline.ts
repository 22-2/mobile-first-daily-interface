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
  TIMELINE_CACHE_INVALIDATE_MS,
  TimelinePostsPage
} from "./timelinePosts";

const PAGE_SIZE_DAYS = 14;

/**
 * タイムラインモード（無限スクロール）のデータ取得と管理を担当するHook。
 */
export const useInfiniteTimeline = () => {
  const { app, appHelper } = useAppContext();
  const [cacheBucket, setCacheBucket] = useState(() =>
    resolveTimelineCacheBucket(),
  );

  const { activeTopic, displayMode } = useSettingsStore(
    useShallow((s) => ({
      activeTopic: s.activeTopic,
      displayMode: s.displayMode,
    })),
  );

  const { setPosts } = usePostsStore(
    useShallow((s) => ({ setPosts: s.setPosts })),
  );
  const { addPaths } = useNoteStore(
    useShallow((s) => ({ addPaths: s.addPaths })),
  );
  const fetchPage = useCallback(
    createTimelinePageFetcher({
      app,
      readFile: appHelper.cachedReadFile.bind(appHelper),
    }),
    [app, appHelper],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
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
    queryKey: ["posts", activeTopic, displayMode, String(cacheBucket)],
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
