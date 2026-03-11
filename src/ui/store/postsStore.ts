import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { TFile, App } from "obsidian";
import { Post, MomentLike, Granularity, TimeFilter, DateFilter, DisplayMode } from "src/ui/types";
import { Task, AppHelper } from "src/app-helper";
import { parseThinoEntries } from "src/utils/thino";
import { resolveTimestamp } from "src/ui/utils/post-utils";
import { sorter } from "src/utils/collections";
import { getAllTopicNotes, getDateUID, getTopicNote } from "src/utils/daily-notes";
import { settingsStore } from "./settingsStore";

interface PostsState {
  posts: Post[];
  tasks: Task[];
  
  // Actions
  setPosts: (posts: Post[]) => void;
  setTasks: (tasks: Task[]) => void;
  updatePosts: (note: TFile) => Promise<void>;
  updateTasks: (note: TFile) => Promise<void>;
  
  // Fetching Actions
  updatePostsForWeek: (topicId: string, date: MomentLike) => Promise<Set<string>>;
  updatePostsForDays: (topicId: string, date: MomentLike, days: number) => Promise<{ paths: Set<string>; hasMore: boolean; lastSearchedDate: MomentLike }>;
  
  // Helpers
  getFilteredPosts: () => Post[];
}

let _app: App | null = null;
let _appHelper: AppHelper | null = null;

export const postsStore = createStore<PostsState>((set, get) => ({
  posts: [],
  tasks: [],

  setPosts: (posts) => set({ posts: posts.sort(sorter((x) => x.timestamp.unix(), "desc")) }),
  setTasks: (tasks) => set({ tasks: tasks }),

  updatePosts: async (note) => {
    if (!_appHelper) return;
    const { date } = settingsStore.getState();
    const content = await _appHelper.loadFile(note.path);
    const _posts: Post[] = parseThinoEntries(content).map((x) => ({
      timestamp: resolveTimestamp(x.time, date, x.metadata),
      message: x.message,
      metadata: x.metadata,
      offset: x.offset,
      startOffset: x.startOffset,
      endOffset: x.endOffset,
      bodyStartOffset: x.bodyStartOffset,
      kind: "thino" as const,
      path: note.path,
    }));
    get().setPosts(_posts);
  },

  updateTasks: async (note) => {
    if (!_appHelper) return;
    set({ tasks: (await _appHelper.getTasks(note)) ?? [] });
  },

  updatePostsForWeek: async (topicId, date) => {
    if (!_app || !_appHelper) return new Set();
    const weekStart = date.clone().startOf("isoWeek");
    const weekDates: MomentLike[] = Array.from({ length: 7 }, (_, i) =>
      weekStart.clone().add(i, "days"),
    );

    const entries = weekDates
      .map((d) => ({
        file: getTopicNote(_app!, d, "day", topicId),
        dayDate: d,
      }))
      .filter((x): x is { file: TFile; dayDate: MomentLike } => x.file !== null);

    const allPosts: Post[] = (
      await Promise.all(
        entries.map(async ({ file, dayDate }) => {
          const content = await _appHelper!.cachedReadFile(file);
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

    get().setPosts(allPosts);
    return new Set(entries.map((e) => e.file.path));
  },

  updatePostsForDays: async (topicId, date, days) => {
    if (!_app || !_appHelper) return { paths: new Set(), hasMore: false, lastSearchedDate: date };

    const getPostsRecursive = async (baseDate: MomentLike): Promise<{ posts: Post[], paths: Set<string>, hasMore: boolean, lastSearchedDate: MomentLike }> => {
      const allTopicNotes = getAllTopicNotes(_app!, "day", topicId);
      const uids = Object.keys(allTopicNotes).sort();
      if (uids.length === 0) return { posts: [], paths: new Set(), hasMore: false, lastSearchedDate: baseDate };

      const oldestPossibleDate = window.moment(uids[0].substring("day-".length));
      const start = baseDate.clone().startOf("day");
      const dates: MomentLike[] = Array.from({ length: days }, (_, i) =>
        start.clone().subtract(i, "days"),
      );
      const lastInWindow = dates[dates.length - 1];

      const entries = dates
        .map((d) => ({ file: allTopicNotes[getDateUID(d, "day")] ?? null, dayDate: d }))
        .filter((x): x is { file: TFile; dayDate: MomentLike } => x.file !== null);

      if (entries.length === 0 && lastInWindow.isAfter(oldestPossibleDate)) {
        const lastUid = getDateUID(lastInWindow, "day");
        const nextUid = uids.slice().reverse().find(u => u < lastUid);
        if (nextUid) return getPostsRecursive(window.moment(nextUid.substring("day-".length)));
      }

      const allPosts: Post[] = (
        await Promise.all(
          entries.map(async ({ file, dayDate }) => {
            const content = await _appHelper!.cachedReadFile(file);
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
    };

    const { posts, paths, hasMore, lastSearchedDate } = await getPostsRecursive(date);
    get().setPosts(posts);
    return { paths, hasMore, lastSearchedDate };
  },

  getFilteredPosts: () => {
    const { posts } = get();
    const { timeFilter, dateFilter, asTask, granularity, displayMode } = settingsStore.getState();
    
    const postsWithoutHidden = posts.filter((p) => !p.metadata.archived && !p.metadata.deleted);
    if (displayMode === "timeline") return postsWithoutHidden;
    if (dateFilter !== "today") return postsWithoutHidden;
    if (timeFilter === "all" || asTask || granularity !== "day") return postsWithoutHidden;
    if (timeFilter === "latest") return postsWithoutHidden.length > 0 ? [postsWithoutHidden[0]] : [];

    const hours = parseInt(timeFilter as string);
    if (isNaN(hours)) return postsWithoutHidden;

    const now = window.moment();
    return postsWithoutHidden.filter((p) => now.diff(p.timestamp, "hours") < hours);
  },
}));

export function initializePostsStore(app: App, appHelper: AppHelper) {
  _app = app;
  _appHelper = appHelper;
}

export function usePostsStore<T>(selector: (state: PostsState) => T): T {
  return useStore(postsStore, selector);
}
