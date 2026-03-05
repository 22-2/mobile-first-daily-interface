import { TFile } from "obsidian";
import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { AppHelper, Task } from "../../app-helper";
import { PostFormat } from "../../settings";
import { sorter } from "../../utils/collections";
import { parseThinoEntries } from "../../utils/thino";
import { DATE_FORMAT, DATE_TIME_FORMAT } from "../date-formats";
import { Granularity, MomentLike, Post } from "../types";

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
  const { appHelper } = useAppContext();
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

  return { posts, tasks, setPosts, setTasks, updatePosts, updateTasks };
}
