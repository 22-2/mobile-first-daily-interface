import { useInfiniteQuery } from "@tanstack/react-query";
import * as React from "react";
import { useCallback, useEffect } from "react";
import { DisplayMode, MomentLike, Post } from "src/ui/types";

type PostsPage = {
  posts: Post[];
  paths: Set<string>;
  hasMore: boolean;
  lastSearchedDate: MomentLike;
};

interface UseInfiniteTimelineProps {
  activeTopic: string;
  displayMode: DisplayMode;
  date: MomentLike;
  getPostsForDays: (
    topicId: string,
    baseDate: MomentLike,
    days: number,
  ) => Promise<PostsPage>;
  setPosts: (posts: Post[]) => void;
  addPaths: (paths: Set<string>) => void;
}

/**
 * タイムラインモード（無限スクロール）のデータ取得と管理を担当するHook。
 */
export const useInfiniteTimeline = ({
  activeTopic,
  displayMode,
  date,
  getPostsForDays,
  setPosts,
  addPaths,
}: UseInfiniteTimelineProps) => {
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = window.moment
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      useInfiniteQuery<
        PostsPage,
        Error,
        { pages: PostsPage[]; pageParams: (string | null)[] },
        string[],
        string | null
      >({
        queryKey: ["posts", activeTopic, displayMode],
        queryFn: async ({ pageParam }) => {
          const baseDate = pageParam ? window.moment(pageParam) : date.clone();
          const result = await getPostsForDays(activeTopic, baseDate, 14);

          // 監視対象パスを更新
          addPaths(result.paths);

          return result;
        },
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => {
          return lastPage.hasMore
            ? lastPage.lastSearchedDate.clone().subtract(1, "day").format()
            : undefined;
        },
        enabled: displayMode === "timeline",
      })
    : {
        data: null,
        fetchNextPage: () => {},
        hasNextPage: false,
        isFetchingNextPage: false,
      };

  // TanStack Query の結果を posts に反映
  useEffect(() => {
    if (displayMode === "timeline" && infiniteData) {
      const allPosts = infiniteData.pages.flatMap((p) => p.posts);
      setPosts(
        allPosts.sort(
          (a: Post, b: Post) => b.timestamp.valueOf() - a.timestamp.valueOf(),
        ),
      );
    }
  }, [displayMode, infiniteData, setPosts]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    loadMore,
    hasMore: hasNextPage,
    isFetchingNextPage,
  };
};
