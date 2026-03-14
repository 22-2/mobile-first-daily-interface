import { useCallback } from "react";
import { usePostsStore } from "src/ui/store/postsStore";
import { MomentLike } from "src/ui/types";
import { useShallow } from "zustand/shallow";

interface UsePostsAndTasksOptions {
  date: MomentLike;
  granularity?: any; // 引数は受け取るが内部ストアで管理
}

/**
 * 指定されたファイルから投稿（Post）とタスク（Task）を抽出し、パースするHook。
 */
export function usePostsAndTasks({ date }: UsePostsAndTasksOptions) {
  const state = usePostsStore(
    useShallow((s) => ({
      posts: s.posts,
      tasks: s.tasks,
      setPosts: s.setPosts,
      setTasks: s.setTasks,
      updatePosts: s.updatePosts,
      updateTasks: s.updateTasks,
      updatePostsForWeekStore: s.updatePostsForWeek,
      updatePostsForDaysStore: s.updatePostsForDays,
    })),
  );

  const updatePostsForWeek = useCallback(
    (topicId: string) => {
      return state.updatePostsForWeekStore(topicId, date);
    },
    [state.updatePostsForWeekStore, date],
  );

  const updatePostsForDays = useCallback(
    (topicId: string, days: number) => {
      return state.updatePostsForDaysStore(topicId, date, days);
    },
    [state.updatePostsForDaysStore, date],
  );

  return {
    ...state,
    updatePostsForWeek,
    updatePostsForDays,
    appendPostsForDays: async () => ({
      posts: [],
      paths: new Set<string>(),
      hasMore: false,
      lastSearchedDate: date,
    }), // 未実装または不要
    getPostsForWeek: async () => ({ posts: [], paths: new Set<string>() }), // 未実装または不要
    getPostsForDays: async () => ({
      posts: [],
      paths: new Set<string>(),
      hasMore: false,
      lastSearchedDate: date,
    }), // 未実装または不要
  };
}
