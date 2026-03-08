import { TFile } from "obsidian";
import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { Task } from "../../app-helper";
import { PostFormat } from "../../settings";
import { sorter } from "../../utils/collections";
import { getTopicNote } from "../../utils/daily-notes";
import { parseThinoEntries } from "../../utils/thino";
import { Granularity, MomentLike, Post } from "../types";

import { DATE_FORMAT, DATE_TIME_FORMAT } from "../config/date-formats";
import { useAppContext } from "../context/AppContext";

interface UsePostsAndTasksOptions {
  postFormat: PostFormat;
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
}

/**
 * エントリの時刻文字列と日付ファイルの日付から timestamp を解決する。
 * 時刻のみ（"HH:mm:ss" 形式）の旧エントリは後方互換のため date の日付を補完する。
 * 日付あり（"YYYY-MM-DD HH:mm:ss" 形式）の新エントリはそのままパースする。
 */
export function resolveTimestamp(time: string, date: MomentLike): MomentLike {
  const hasDate = time.includes("-");
  return hasDate
    ? window.moment(time, DATE_TIME_FORMAT)
    : window.moment(`${date.format(DATE_FORMAT)} ${time}`, DATE_TIME_FORMAT);
}

/**
 * 指定されたファイルから投稿（Post）とタスク（Task）を抽出し、パースするHook。
 */
export function usePostsAndTasks({
  postFormat,
  date,
  granularity,
}: UsePostsAndTasksOptions): UsePostsAndTasksReturn {
  const { app, appHelper } = useAppContext();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const updatePosts = useCallback(
    async (note: TFile) => {
      const _posts: Post[] = parseThinoEntries(
        await appHelper.loadFile(note.path)
      ).map((x) => {
        return {
          timestamp: resolveTimestamp(x.time, date),
          message: x.message,
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
    [appHelper, postFormat, date]
  );

  const updateTasks = useCallback(
    async (note: TFile) => {
      setTasks((await appHelper.getTasks(note)) ?? []);
    },
    [appHelper]
  );

  const updatePostsForWeek = useCallback(
    async (topicId: string): Promise<Set<string>> => {
      // 今週の月曜〜日曜の日付を列挙
      const weekStart = window.moment().startOf("isoWeek");
      const weekDates: MomentLike[] = Array.from({ length: 7 }, (_, i) =>
        weekStart.clone().add(i, "days")
      );

      // 存在するノートだけを収集
      const entries: { file: TFile; dayDate: MomentLike }[] = weekDates
        .map((d) => ({ file: getTopicNote(app, d, "day", topicId), dayDate: d }))
        .filter((x): x is { file: TFile; dayDate: MomentLike } => x.file !== null);

      // 並列で cachedRead
      const allPosts: Post[] = (
        await Promise.all(
          entries.map(async ({ file, dayDate }) => {
            const content = await appHelper.cachedReadFile(file);
            return parseThinoEntries(content).map((x) => ({
              timestamp: resolveTimestamp(x.time, dayDate),
              message: x.message,
              offset: x.offset,
              startOffset: x.startOffset,
              endOffset: x.endOffset,
              bodyStartOffset: x.bodyStartOffset,
              kind: "thino" as const,
              path: file.path,
            }));
          })
        )
      ).flat();

      setPosts(allPosts.sort(sorter((x) => x.timestamp.unix(), "desc")));

      // 監視対象パス集合を返す
      return new Set(entries.map((e) => e.file.path));
    },
    [app, appHelper]
  );

  return { posts, tasks, setPosts, setTasks, updatePosts, updateTasks, updatePostsForWeek };
}
