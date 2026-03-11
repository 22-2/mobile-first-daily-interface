import { useInfiniteQuery } from "@tanstack/react-query";
import { TFile } from "obsidian";
import { useCallback, useEffect } from "react";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { MomentLike, Post } from "src/ui/types";
import { resolveTimestamp } from "src/ui/utils/post-utils";
import { getAllTopicNotes, getDateUID } from "src/utils/daily-notes";
import { parseThinoEntries } from "src/utils/thino";
import { useShallow } from "zustand/shallow";

const PAGE_SIZE_DAYS = 14;

type PostsPage = {
  posts: Post[];
  paths: Set<string>;
  hasMore: boolean;
  lastSearchedDate: MomentLike;
};

// ---------------------------------------------------------------------------
// ヘルパー: ファイル内容 → Post[] に変換
// ---------------------------------------------------------------------------
async function parsePostsFromFile(
  file: TFile,
  dayDate: MomentLike,
  readFile: (f: TFile) => Promise<string>,
): Promise<Post[]> {
  const content = await readFile(file);
  return parseThinoEntries(content).map((x) => ({
    timestamp:       resolveTimestamp(x.time, dayDate, x.metadata),
    message:         x.message,
    metadata:        x.metadata,
    offset:          x.offset,
    startOffset:     x.startOffset,
    endOffset:       x.endOffset,
    bodyStartOffset: x.bodyStartOffset,
    kind:            "thino" as const,
    path:            file.path,
  }));
}

/**
 * タイムラインモード（無限スクロール）のデータ取得と管理を担当するHook。
 */
export const useInfiniteTimeline = () => {
  const { app, appHelper } = useAppContext();

  const { activeTopic, displayMode, date } = useSettingsStore(useShallow(s => ({
    activeTopic:  s.activeTopic,
    displayMode:  s.displayMode,
    date:         s.date,
  })));

  const { setPosts }  = usePostsStore(useShallow(s => ({ setPosts: s.setPosts })));
  const { addPaths }  = useNoteStore(useShallow(s => ({ addPaths: s.addPaths })));

  // ---------------------------------------------------------------------------
  // ページ単位のデータ取得（再帰で「有効なデータが存在する最初のウィンドウ」を探す）
  // ---------------------------------------------------------------------------
  const fetchPage = useCallback(async (
    topicId:  string,
    baseDate: MomentLike,
    days:     number,
  ): Promise<PostsPage> => {
    const allTopicNotes = getAllTopicNotes(app, "day", topicId);
    const uids = Object.keys(allTopicNotes).toSorted();

    if (uids.length === 0) {
      return { posts: [], paths: new Set(), hasMore: false, lastSearchedDate: baseDate };
    }

    const oldestDate    = window.moment(uids[0].substring("day-".length));
    const windowStart   = baseDate.clone().startOf("day");
    const windowDates   = Array.from({ length: days }, (_, i) => windowStart.clone().subtract(i, "days"));
    const windowEnd     = windowDates[windowDates.length - 1];

    // ウィンドウ内に実際にノートが存在する日だけ絞り込む
    const entries = windowDates
      .map((d) => ({ file: allTopicNotes[getDateUID(d, "day")] ?? null, dayDate: d }))
      .filter((x): x is { file: TFile; dayDate: MomentLike } => x.file !== null);

    // ウィンドウ内にノートがなく、まだ古いデータが残っている場合は次ウィンドウへ再帰
    if (entries.length === 0 && windowEnd.isAfter(oldestDate)) {
      const windowEndUid = getDateUID(windowEnd, "day");
      const nextUid      = uids.slice().reverse().find(u => u < windowEndUid);
      if (nextUid) {
        return fetchPage(topicId, window.moment(nextUid.substring("day-".length)), days);
      }
    }

    const posts = (
      await Promise.all(
        entries.map(({ file, dayDate }) => parsePostsFromFile(file, dayDate, appHelper.cachedReadFile.bind(appHelper))),
      )
    ).flat();

    return {
      posts,
      paths:           new Set(entries.map((e) => e.file.path)),
      hasMore:         windowEnd.isAfter(oldestDate),
      lastSearchedDate: windowEnd,
    };
  }, [app, appHelper]);

  // ---------------------------------------------------------------------------
  // 無限クエリ
  // ---------------------------------------------------------------------------
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PostsPage, Error, { pages: PostsPage[]; pageParams: (string | null)[] }, string[], string | null>({
    queryKey:   ["posts", activeTopic, displayMode],
    enabled:    displayMode === DISPLAY_MODE.TIMELINE,
    initialPageParam: null,

    queryFn: async ({ pageParam }) => {
      const baseDate = pageParam ? window.moment(pageParam) : date.clone();
      const result   = await fetchPage(activeTopic, baseDate, PAGE_SIZE_DAYS);
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
    if (displayMode === DISPLAY_MODE.TIMELINE && infiniteData) {
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
