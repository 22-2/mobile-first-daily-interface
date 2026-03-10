import { TFile } from "obsidian";
import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { Task } from "../../app-helper";
import { sorter } from "../../utils/collections";
import { getAllTopicNotes, getDateUID, getTopicNote } from "../../utils/daily-notes";
import { parseThinoEntries } from "../../utils/thino";
import { Granularity, MomentLike, Post } from "../types";

import { DATE_FORMAT, DATE_TIME_FORMAT } from "../config/date-formats";
import { useAppContext } from "../context/AppContext";
import { resolveTimestamp } from "../utils/post-utils";

interface UsePostsAndTasksOptions {
  date: MomentLike;
  granularity: Granularity;
}

interface UsePostsAndTasksReturn {
  posts: Post[];
  tasks: Task[];
  setPosts: Dispatch<SetStateAction<Post[]>>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  updatePosts: (note: TFile) => Promise<void>;
  updateTasks: (note: TFile) => Promise<void>;
  /** 今週のデイリーノートを全件読み込み posts を更新。監視対象パス集合を返す。 */
  updatePostsForWeek: (topicId: string) => Promise<Set<string>>;
  /** 直近N日間のデイリーノートを全件読み込み posts を更新。監視対象パス集合を返す。 */
  updatePostsForDays: (topicId: string, days: number) => Promise<{ paths: Set<string>; hasMore: boolean; lastSearchedDate: MomentLike }>;
  /** 指定されたベース日から過去N日間のデイリーノートを読み込み posts に追加。監視対象パス集合を返す。 */
  appendPostsForDays: (topicId: string, baseDate: MomentLike, days: number) => Promise<{ posts: Post[]; paths: Set<string>; hasMore: boolean; lastSearchedDate: MomentLike }>;
  
  // 純粋にデータを取得するだけのメソッド (Query用)
  getPostsForWeek: (topicId: string) => Promise<{ posts: Post[]; paths: Set<string> }>;
  getPostsForDays: (topicId: string, baseDate: MomentLike, days: number) => Promise<{ posts: Post[], paths: Set<string>, hasMore: boolean, lastSearchedDate: MomentLike }>;
}


/**
 * 指定されたファイルから投稿（Post）とタスク（Task）を抽出し、パースするHook。
 */
export function usePostsAndTasks({
  date,
  granularity,
}: UsePostsAndTasksOptions): UsePostsAndTasksReturn {
  const { app, appHelper } = useAppContext();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const updatePosts = useCallback(
    async (note: TFile) => {
      const _posts: Post[] = parseThinoEntries(
        await appHelper.loadFile(note.path),
      ).map((x) => {
        return {
          timestamp: resolveTimestamp(x.time, date, x.metadata),
          message: x.message,
          metadata: x.metadata,
          offset: x.offset,
          startOffset: x.startOffset,
          endOffset: x.endOffset,
          bodyStartOffset: x.bodyStartOffset,
          kind: "thino" as const,
          path: note.path,
        };
      });

      setPosts(_posts.sort(sorter((x) => x.timestamp.unix(), "desc")));
    },
    [appHelper, date],
  );

  const updateTasks = useCallback(
    async (note: TFile) => {
      setTasks((await appHelper.getTasks(note)) ?? []);
    },
    [appHelper],
  );

  const getPostsForWeek = useCallback(
    async (topicId: string): Promise<{ posts: Post[]; paths: Set<string> }> => {
      // 指定された日の週の月曜〜日曜の日付を列挙
      const weekStart = date.clone().startOf("isoWeek");
      const weekDates: MomentLike[] = Array.from({ length: 7 }, (_, i) =>
        weekStart.clone().add(i, "days"),
      );

      // 存在するノートだけを収集
      const entries: { file: TFile; dayDate: MomentLike }[] = weekDates
        .map((d) => ({
          file: getTopicNote(app, d, "day", topicId),
          dayDate: d,
        }))
        .filter(
          (x): x is { file: TFile; dayDate: MomentLike } => x.file !== null,
        );

      // 並列で cachedRead
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
      };
    },
    [app, appHelper, date],
  );

  const updatePostsForWeek = useCallback(
    async (topicId: string): Promise<Set<string>> => {
      const { posts: allPosts, paths } = await getPostsForWeek(topicId);
      setPosts(allPosts.sort(sorter((x) => x.timestamp.unix(), "desc")));
      return paths;
    },
    [getPostsForWeek],
  );

  const getPostsForDays = useCallback(
    async (topicId: string, baseDate: MomentLike, days: number): Promise<{ posts: Post[], paths: Set<string>, hasMore: boolean, lastSearchedDate: MomentLike }> => {
      const allTopicNotes = getAllTopicNotes(app, "day", topicId);
      const uids = Object.keys(allTopicNotes).sort(); // 昇順 (古い順)
      if (uids.length === 0) {
        return { posts: [], paths: new Set(), hasMore: false, lastSearchedDate: baseDate };
      }

      // 存在する全ノートの中で最も古い日付を特定 (UID: day-2025-10-12T00:00:00+09:00)
      const oldestUid = uids[0];
      // "day-" プレフィックスを飛ばしてパース
      const datePart = oldestUid.substring("day-".length);
      const oldestPossibleDate = window.moment(datePart);

      const start = baseDate.clone().startOf("day");
      const dates: MomentLike[] = Array.from({ length: days }, (_, i) =>
        start.clone().subtract(i, "days"),
      );
      const lastInWindow = dates[dates.length - 1];

      const entries: { file: TFile; dayDate: MomentLike }[] = dates
        .map((d) => {
          const uid = getDateUID(d, "day");
          return {
            file: allTopicNotes[uid] ?? null,
            dayDate: d,
          };
        })
        .filter(
          (x): x is { file: TFile; dayDate: MomentLike } => x.file !== null,
        );

      // --- ギャップスキップロジック ---
      // もしこの期間に1つもノートがなく、かつまだ過去にノートがあるなら、
      // 次にノートが存在する日付までジャンプして再試行する
      if (entries.length === 0 && lastInWindow.isAfter(oldestPossibleDate)) {
        const lastInWindowUid = getDateUID(lastInWindow, "day");
        // lastInWindowUid より小さくて最大の UID (＝次に新しいノート) を探す
        const nextUid = uids.slice().reverse().find(u => u < lastInWindowUid);
        if (nextUid) {
          // プレフィックスを削ってパース
          const nextDatePart = nextUid.substring("day-".length);
          return getPostsForDays(topicId, window.moment(nextDatePart), days);
        }
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

      const hasMore = lastInWindow.isAfter(oldestPossibleDate);

      return {
        posts: allPosts,
        paths: new Set(entries.map((e) => e.file.path)),
        hasMore,
        lastSearchedDate: lastInWindow,
      };
    },
    [app, appHelper],
  );

  const updatePostsForDays = useCallback(
    async (topicId: string, days: number): Promise<{ paths: Set<string>; hasMore: boolean; lastSearchedDate: MomentLike }> => {
      const { posts: allPosts, paths, hasMore, lastSearchedDate } = await getPostsForDays(topicId, date, days);
      setPosts(allPosts.sort(sorter((x) => x.timestamp.unix(), "desc")));
      return { paths, hasMore, lastSearchedDate };
    },
    [date, getPostsForDays],
  );

  const appendPostsForDays = useCallback(
    async (topicId: string, baseDate: MomentLike, days: number): Promise<{ posts: Post[]; paths: Set<string>; hasMore: boolean; lastSearchedDate: MomentLike }> => {
      const { posts: newPosts, paths, hasMore, lastSearchedDate } = await getPostsForDays(topicId, baseDate, days);
      setPosts((prev) => [...prev, ...newPosts].sort(sorter((x) => x.timestamp.unix(), "desc")));
      return { posts: newPosts, paths, hasMore, lastSearchedDate };
    },
    [getPostsForDays],
  );

  return {
    posts,
    tasks,
    setPosts,
    setTasks,
    updatePosts,
    updateTasks,
    updatePostsForWeek,
    updatePostsForDays,
    appendPostsForDays,
    getPostsForWeek,
    getPostsForDays,
  };
}
