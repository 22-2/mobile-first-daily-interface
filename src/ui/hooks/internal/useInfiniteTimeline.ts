import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { useShallow } from "zustand/shallow";
import { Post, MomentLike } from "src/ui/types";
import { getAllTopicNotes, getDateUID } from "src/utils/daily-notes";
import { parseThinoEntries } from "src/utils/thino";
import { resolveTimestamp } from "src/ui/utils/post-utils";
import { useAppContext } from "src/ui/context/AppContext";
import { TFile } from "obsidian";

type PostsPage = {
  posts: Post[];
  paths: Set<string>;
  hasMore: boolean;
  lastSearchedDate: MomentLike;
};

/**
 * タイムラインモード（無限スクロール）のデータ取得と管理を担当するHook。
 */
export const useInfiniteTimeline = () => {
  const { app, appHelper } = useAppContext();
  
  const settingsState = useSettingsStore(useShallow(s => ({
    activeTopic: s.activeTopic,
    displayMode: s.displayMode,
    date: s.date,
  })));

  const postsState = usePostsStore(useShallow(s => ({
    setPosts: s.setPosts,
  })));

  const noteState = useNoteStore(useShallow(s => ({
    addPaths: s.addPaths,
  })));

  // 純粋なデータ取得関数 (互換性のため内部に定義するか store から持ってくる)
  const getPostsForDaysPure = useCallback(async (topicId: string, baseDate: MomentLike, days: number): Promise<PostsPage> => {
    const allTopicNotes = getAllTopicNotes(app, "day", topicId);
    const uids = Object.keys(allTopicNotes).sort();
    if (uids.length === 0) return { posts: [], paths: new Set(), hasMore: false, lastSearchedDate: baseDate };

    const oldestPossibleDate = window.moment(uids[0].substring("day-".length));
    const start = baseDate.clone().startOf("day");
    const dates: MomentLike[] = Array.from({ length: days }, (_, i) => start.clone().subtract(i, "days"));
    const lastInWindow = dates[dates.length - 1];

    const entries = dates
      .map((d) => ({ file: allTopicNotes[getDateUID(d, "day")] ?? null, dayDate: d }))
      .filter((x): x is { file: TFile; dayDate: MomentLike } => x.file !== null);

    if (entries.length === 0 && lastInWindow.isAfter(oldestPossibleDate)) {
      const lastUid = getDateUID(lastInWindow, "day");
      const nextUid = uids.slice().reverse().find(u => u < lastUid);
      if (nextUid) return getPostsForDaysPure(topicId, window.moment(nextUid.substring("day-".length)), days);
    }

    const allPosts: Post[] = (
      await Promise.all(
        entries.map(async ({ file, dayDate }) => {
          const content = await appHelper.cachedReadFile(file);
          return parseThinoEntries(content).map((x) => ({
            timestamp: resolveTimestamp(x.time, dayDate, x.metadata),
            message: x.message,
            metadata: x.metadata,
            offset: x.offset,
            startOffset: x.startOffset,
            endOffset: x.endOffset,
            bodyStartOffset: x.bodyStartOffset,
            kind: "thino" as const,
            path: file.path,
          }));
        }),
      )
    ).flat();

    return {
      posts: allPosts,
      paths: new Set(entries.map((e) => e.file.path)),
      hasMore: lastInWindow.isAfter(oldestPossibleDate),
      lastSearchedDate: lastInWindow,
    };
  }, [app, appHelper]);

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PostsPage, Error, { pages: PostsPage[]; pageParams: (string | null)[] }, string[], string | null>({
    queryKey: ["posts", settingsState.activeTopic, settingsState.displayMode],
    queryFn: async ({ pageParam }) => {
      const baseDate = pageParam ? window.moment(pageParam) : settingsState.date.clone();
      const result = await getPostsForDaysPure(settingsState.activeTopic, baseDate, 14);
      noteState.addPaths(result.paths);
      return result;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.lastSearchedDate.clone().subtract(1, "day").format() : undefined;
    },
    enabled: settingsState.displayMode === "timeline",
  });

  useEffect(() => {
    if (settingsState.displayMode === "timeline" && infiniteData) {
      const allPosts = infiniteData.pages.flatMap((p) => p.posts);
      postsState.setPosts(allPosts);
    }
  }, [settingsState.displayMode, infiniteData, postsState.setPosts]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { loadMore, hasMore: hasNextPage, isFetchingNextPage };
};
