import { resolveTimestamp } from "src/core/post-utils";
import { parseThinoEntries } from "src/core/thino";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/ui/config/filter-config";
import type { MFDIStore, PostsSlice } from "src/ui/store/slices/types";
import type { MomentLike, Post } from "src/ui/types";
import { filterPostsByRelativeWindow } from "src/ui/utils/post-filters";
import { isArchived, isDeleted } from "src/ui/utils/post-metadata";
import {
  buildPostFromEntry,
  memoRecordToPost,
  sortPostsDescending,
} from "src/ui/utils/thread-utils";
import { isTimelineView } from "src/ui/utils/view-mode";
import type { StateCreator } from "zustand/vanilla";

function buildPostsFromContent(
  content: string,
  path: string,
  date: MomentLike,
): Post[] {
  return parseThinoEntries(content).map((entry) =>
    buildPostFromEntry({
      ...entry,
      path,
      noteDate: date,
      resolveTimestamp,
    }),
  );
}

export const createPostsSlice: StateCreator<MFDIStore, [], [], PostsSlice> = (
  set,
  get,
) => ({
  posts: [],
  tasks: [],

  setPosts: (posts) => {
    set({ posts: sortPostsDescending(posts) });
  },

  setTasks: (tasks) => {
    set({ tasks });
  },

  updatePosts: async (note) => {
    const { shell, date, setPosts, viewNoteMode } = get();
    if (!shell) return;
    const content = await shell.loadFile(note.path);
    setPosts(
      buildPostsFromContent(
        content,
        note.path,
        viewNoteMode === "fixed" ? window.moment() : date,
      ),
    );
  },

  updateTasks: async (note) => {
    const { shell } = get();
    if (!shell) return;
    set({ tasks: (await shell.getTasks(note)) ?? [] });
  },

  updatePostsForWeek: async (topicId, date) => {
    const { db, setPosts } = get();
    if (!db) return new Set();

    const weekStart = date.clone().startOf("isoWeek");
    const weekEnd = date.clone().endOf("isoWeek");

    const records = await db.getVisibleMemosByDateRange({
      topicId,
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
    });

    const posts = records.map(memoRecordToPost);
    setPosts(posts);
    return new Set(posts.map((p) => p.path));
  },

  updatePostsForDays: async (topicId, date, days) => {
    const { db, setPosts } = get();
    if (!db) {
      return {
        paths: new Set<string>(),
        hasMore: false,
        lastSearchedDate: date,
      };
    }

    const windowStart = date
      .clone()
      .subtract(days - 1, "days")
      .startOf("day");
    const windowEnd = date.clone().endOf("day");

    const records = await db.getVisibleMemosByDateRange({
      topicId,
      startDate: windowStart.toISOString(),
      endDate: windowEnd.toISOString(),
    });

    const posts = records.map(memoRecordToPost);
    setPosts(posts);

    return {
      posts,
      paths: new Set(posts.map((p) => p.path)),
      hasMore: false, // DB 検索時は指定範囲のデータが全て取得されている前提
      lastSearchedDate: windowStart,
    };
  },

  updatePostsFromDB: async ({ topicId, limit = 300 }) => {
    const { db, setPosts } = get();
    if (!db) return;

    const records = await db.getLatestVisibleMemos(topicId, limit);
    setPosts(records.map(memoRecordToPost));
  },

  getFilteredPosts: () => {
    const {
      posts,
      timeFilter,
      dateFilter,
      asTask,
      granularity,
      displayMode,
      viewNoteMode,
    } = get();
    const visiblePosts = posts.filter(
      (post) => !isArchived(post.metadata) && !isDeleted(post.metadata),
    );

    if (viewNoteMode === "fixed") {
      return filterPostsByRelativeWindow(visiblePosts, {
        dateFilter,
        timeFilter,
        asTask,
        granularity,
      });
    }
    if (isTimelineView(displayMode)) return visiblePosts;
    if (dateFilter !== DATE_FILTER_IDS.TODAY) return visiblePosts;
    if (timeFilter === TIME_FILTER_IDS.ALL || asTask || granularity !== "day")
      return visiblePosts;
    if (timeFilter === TIME_FILTER_IDS.LATEST)
      return visiblePosts.length > 0 ? [visiblePosts[0]] : [];

    const hours = Number.parseInt(timeFilter as string, 10);
    if (Number.isNaN(hours)) return visiblePosts;

    const now = window.moment();
    return visiblePosts.filter(
      (post) => now.diff(post.timestamp, "hours") < hours,
    );
  },
});
