import { useCallback, useEffect, useMemo } from "react";
import { mutate } from "swr";
import useSWRInfinite from "swr/infinite";
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
  const isTimelineVisible = isTimelineView(displayMode);
  // activeDocument は、Obsidianの変数で、現在アクティブなウィンドウドキュメントを指す。
  // SWRのキー作成からは hasFocus を除外する。そうしないとフォーカスが外れた瞬間にデータが消えてしまう (key=null) ため。
  const shouldFetchDb = isTimelineVisible;
  const isFocused = activeDocument.hasFocus();

  const { addPaths } = useNoteStore(
    useShallow((s) => ({ addPaths: s.addPaths })),
  );

  useEffect(() => {
    // タイムラインを表示中であれば、現在の日付とタイムラインの基準日が同じか確認し、異なっていれば更新する
    const timer = window.setInterval(() => {
      // タイムライン非表示中、またはウィンドウがフォーカスされていない場合は何もしない
      if (!isTimelineVisible || !activeDocument.hasFocus()) {
        return;
      }

      const state = settingsStore.getState();
      const now = window.moment();
      if (!state.date.isSame(now, "day")) {
        state.setDate(now);
      }

      mutate(
        (key) =>
          Array.isArray(key) &&
          key[0] === "posts" &&
          key[1] === activeTopic &&
          key[2] === displayMode,
      );
    }, 30 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeTopic, displayMode, shouldFetchDb]);

  // ---------------------------------------------------------------------------
  // 無限クエリ
  // ---------------------------------------------------------------------------
  const {
    data: infiniteData,
    size,
    setSize,
    isValidating,
    isLoading,
  } = useSWRInfinite<TimelinePostsPage>(
    (pageIndex, previousPageData) => {
      if (!shouldFetchDb) return null;
      if (previousPageData && !previousPageData.hasMore) return null;

      const pageParam =
        pageIndex === 0
          ? null
          : previousPageData!.lastSearchedDate.clone().subtract(1, "day").format();

      return [
        "posts",
        activeTopic,
        displayMode,
        timelineDayKey,
        searchQuery,
        pageParam,
      ];
    },
    async (key) => {
      const pageParam = key[key.length - 1];

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
    {},
  );

  const hasNextPage =
    infiniteData && infiniteData[infiniteData.length - 1]?.hasMore;
  const isFetchingNextPage =
    size > 0 && infiniteData && typeof infiniteData[size - 1] === "undefined";
  // SWR loads all pages on initial mount if size > 1, but here size starts at 1.
  // When loading more, setSize(size + 1) makes isValidating true.

  // ---------------------------------------------------------------------------
  // ページデータを取得
  // ---------------------------------------------------------------------------
  const allPosts = useMemo(() => {
    return infiniteData?.flatMap((p) => p.posts) ?? [];
  }, [infiniteData]);

  // ---------------------------------------------------------------------------
  // 次ページ読み込みトリガー
  // ---------------------------------------------------------------------------
  const loadMore = useCallback(() => {
    if (hasNextPage && !isValidating) setSize(size + 1);
  }, [hasNextPage, isValidating, size, setSize]);

  return { allPosts, loadMore, hasMore: hasNextPage, isFetchingNextPage };
};

export { resolveTimelineCacheBucket };
