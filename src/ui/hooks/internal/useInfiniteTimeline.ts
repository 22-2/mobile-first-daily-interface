import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import type { TimelinePostsPage } from "src/ui/hooks/internal/timelinePosts";
import {
  resolveTimelineBaseDate,
  resolveTimelineCacheBucket,
} from "src/ui/hooks/internal/timelinePosts";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { useNoteStore } from "src/ui/store/noteStore";
import { settingsStore, useSettingsStore } from "src/ui/store/settingsStore";
import { memoRecordToPost } from "src/ui/utils/thread-utils";
import { isTimelineView } from "src/ui/utils/view-mode";
import { useShallow } from "zustand/shallow";

const PAGE_SIZE_DAYS = 14;

/**
 * タイムラインモード（無限スクロール）のデータ取得と管理を担当するHook。
 */
export const useInfiniteTimeline = () => {
  const dbService = useMFDIDB();
  const queryClient = useQueryClient();

  const { activeTopic, displayMode, date, searchQuery } = useSettingsStore(
    useShallow((s) => ({
      activeTopic: s.activeTopic,
      displayMode: s.displayMode,
      date: s.date,
      searchQuery: s.searchQuery,
    })),
  );
  const timelineDayKey = date.format("YYYY-MM-DD");
  // activeDocument は、Obsidianの変数で、現在アクティブなウィンドウドキュメントを指す。これを使って、ユーザーが実際にタイムラインを見ているかどうかを判断する。
  const shouldFetchDb =
    isTimelineView(displayMode) && activeDocument.hasFocus();

  const { addPaths } = useNoteStore(
    useShallow((s) => ({ addPaths: s.addPaths })),
  );

  useEffect(() => {
    // タイムラインを表示中であれば、現在の日付とタイムラインの基準日が同じか確認し、異なっていれば更新する
    const timer = window.setInterval(() => {
      if (!shouldFetchDb) {
        return;
      }

      const state = settingsStore.getState();
      const now = window.moment();
      if (!state.date.isSame(now, "day")) {
        state.setDate(now);
      }

      queryClient.invalidateQueries({
        queryKey: ["posts", activeTopic, displayMode],
      });
    }, 30 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [queryClient, activeTopic, displayMode]);

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
      timelineDayKey,
      searchQuery,
    ].filter(Boolean),
    enabled: shouldFetchDb,
    initialPageParam: null,

    queryFn: async ({ pageParam }) => {
      const baseDate = resolveTimelineBaseDate(
        pageParam,
        settingsStore.getState().getEffectiveDate,
      );

      const endDate = baseDate.clone().endOf("day");
      const startDate = baseDate
        .clone()
        .subtract(PAGE_SIZE_DAYS - 1, "day")
        .startOf("day");

      const records = await dbService.getMemos({
        topicId: activeTopic,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        query: searchQuery,
      });

      const posts = records.map(memoRecordToPost);
      const paths = new Set(posts.map((p) => p.path));
      addPaths(paths);

      // 判定ロジック: このウィンドウより前に投稿が存在するかを確認して
      // 次ページの有無を決定する（timelinePosts.createTimelinePageFetcher と同等）。
      const older = await dbService.getMemos({
        topicId: activeTopic,
        startDate: "0000-01-01T00:00:00.000Z",
        endDate: startDate.clone().subtract(1, "ms").toISOString(),
        limit: 1,
        query: searchQuery,
      });

      const result: TimelinePostsPage = {
        posts,
        paths,
        hasMore: (older?.length ?? 0) > 0,
        lastSearchedDate: startDate,
      };

      return result;
    },

    getNextPageParam: (lastPage) =>
      lastPage.hasMore
        ? lastPage.lastSearchedDate.clone().subtract(1, "day").format()
        : undefined,
  });

  // ---------------------------------------------------------------------------
  // ページデータを取得
  // ---------------------------------------------------------------------------
  const allPosts = useMemo(() => {
    return infiniteData?.pages.flatMap((p) => p.posts) ?? [];
  }, [infiniteData]);

  // ---------------------------------------------------------------------------
  // 次ページ読み込みトリガー
  // ---------------------------------------------------------------------------
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { allPosts, loadMore, hasMore: hasNextPage, isFetchingNextPage };
};

export { resolveTimelineCacheBucket };
