import {
  collectPeriodicNoteEntries,
  searchPeriodicDayWindow,
} from "src/core/note-source";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/ui/config/filter-config";
import { MomentLike, Post } from "src/ui/types";
import { filterPostsByRelativeWindow } from "src/ui/utils/post-filters";
import { isArchived, isDeleted } from "src/ui/utils/post-metadata";
import { resolveTimestamp } from "src/ui/utils/post-utils";
import {
  buildPostFromEntry,
  sortPostsDescending,
} from "src/ui/utils/thread-utils";
import { isTimelineView } from "src/ui/utils/view-mode";
import { parseThinoEntries } from "src/utils/thino";
import { StateCreator } from "zustand/vanilla";
import { MFDIStore, PostsSlice } from "./types";

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
    const { shell, setPosts } = get();
    if (!shell) return new Set();

    const weekStart = date.clone().startOf("isoWeek");
    const weekDates = Array.from({ length: 7 }, (_, index) =>
      weekStart.clone().add(index, "days"),
    );
    const entries = collectPeriodicNoteEntries(
      shell,
      "day",
      topicId,
      weekDates,
    );

    const posts = (
      await Promise.all(
        entries.map(async ({ file, dayDate }) => {
          const content = await shell.cachedReadFile(file);
          return buildPostsFromContent(content, file.path, dayDate);
        }),
      )
    ).flat();

    setPosts(posts);
    return new Set(entries.map((entry) => entry.file.path));
  },

  updatePostsForDays: async (topicId, date, days) => {
    const { shell, setPosts } = get();
    if (!shell) {
      return {
        paths: new Set<string>(),
        hasMore: false,
        lastSearchedDate: date,
      };
    }

    const getPostsRecursive = async (
      baseDate: MomentLike,
    ): Promise<{
      posts: Post[];
      paths: Set<string>;
      hasMore: boolean;
      lastSearchedDate: MomentLike;
    }> => {
      const { entries, hasMore, lastSearchedDate } = searchPeriodicDayWindow({
        shell,
        activeTopic: topicId,
        baseDate,
        days,
      });

      const posts = (
        await Promise.all(
          entries.map(async ({ file, dayDate }) => {
            const content = await shell.cachedReadFile(file);
            return buildPostsFromContent(content, file.path, dayDate);
          }),
        )
      ).flat();

      return {
        posts,
        paths: new Set(entries.map((entry) => entry.file.path)),
        hasMore,
        lastSearchedDate,
      };
    };

    const result = await getPostsRecursive(date);
    setPosts(result.posts);
    return result;
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
