import { useState, Dispatch, SetStateAction } from "react";
import { TFile } from "obsidian";
import { AppHelper, Task } from "../../app-helper";
import { sorter } from "../../utils/collections";
import { parseThinoEntries } from "../../utils/thino";
import { PostFormat } from "../../settings";
import { Post, MomentLike, Granularity } from "../types";

interface UsePostsAndTasksOptions {
  appHelper: AppHelper;
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

export function usePostsAndTasks({
  appHelper,
  postFormat,
  date,
  granularity,
}: UsePostsAndTasksOptions): UsePostsAndTasksReturn {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const updatePosts = async (note: TFile) => {
    const _posts: Post[] =
      postFormat.type === "thino"
        ? parseThinoEntries(await appHelper.loadFile(note.path)).map((x) => ({
            timestamp: window.moment(
              `${date.format("YYYY-MM-DD")} ${x.time}`,
              "YYYY-MM-DD HH:mm:ss"
            ),
            message: x.message,
            offset: x.offset,
            startOffset: x.startOffset,
            endOffset: x.endOffset,
            bodyStartOffset: x.bodyStartOffset,
            kind: "thino" as const,
          }))
        : postFormat.type === "codeblock"
          ? ((await appHelper.getCodeBlocks(note)) ?? [])
              ?.filter((x) => x.lang === "fw")
              .map((x) => ({
                timestamp: window.moment(x.meta),
                message: x.code,
                offset: x.offset,
                startOffset: x.offset,
                endOffset: x.endOffset,
                bodyStartOffset: x.codeStartOffset,
                kind: "codeblock" as const,
              }))
          : ((await appHelper.getHeaders(note, postFormat.level)) ?? [])
              .filter((x) => window.moment(x.title).isValid())
              .map((x) => ({
                timestamp: window.moment(x.title),
                message: x.body.replace(/^\n+/g, "").replace(/\n+$/g, ""),
                offset: x.titleOffset,
                startOffset: x.titleOffset,
                endOffset: x.endOffset,
                bodyStartOffset: x.bodyStartOffset,
                kind: "header" as const,
              }));

    setPosts(_posts.sort(sorter((x) => x.timestamp.unix(), "desc")));
  };

  const updateTasks = async (note: TFile) => {
    setTasks((await appHelper.getTasks(note)) ?? []);
  };

  return { posts, tasks, setPosts, setTasks, updatePosts, updateTasks };
}
