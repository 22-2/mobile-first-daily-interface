import { TFile } from "obsidian";
import {
  searchPeriodicDayWindow
} from "src/core/note-source";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { MomentLike, Post } from "src/ui/types";
import { resolveTimestamp } from "src/ui/utils/post-utils";
import { buildPostFromEntry } from "src/ui/utils/thread-utils";
import { parseThinoEntries } from "src/utils/thino";

export type TimelinePostsPage = {
  posts: Post[];
  paths: Set<string>;
  hasMore: boolean;
  lastSearchedDate: MomentLike;
};

export const TIMELINE_CACHE_INVALIDATE_MS = 3 * 60 * 1000;

export function resolveTimelineCacheBucket(
  nowMs: number = Date.now(),
  intervalMs: number = TIMELINE_CACHE_INVALIDATE_MS,
): number {
  return Math.floor(nowMs / intervalMs);
}

export interface CreateTimelinePageFetcherDeps {
  shell: ObsidianAppShell;
  readFile: (file: TFile) => Promise<string>;
}

export function resolveTimelineBaseDate(
  pageParam: string | null,
  getEffectiveDate: () => MomentLike,
): MomentLike {
  return pageParam ? window.moment(pageParam) : getEffectiveDate().clone();
}

async function parsePostsFromFile(
  file: TFile,
  dayDate: MomentLike,
  readFile: (file: TFile) => Promise<string>,
): Promise<Post[]> {
  const content = await readFile(file);
  return parseThinoEntries(content).map((entry) =>
    buildPostFromEntry({
      ...entry,
      path: file.path,
      noteDate: dayDate,
      resolveTimestamp,
    }),
  );
}

export function createTimelinePageFetcher({
  shell,
  readFile,
}: CreateTimelinePageFetcherDeps) {
  return async (
    topicId: string,
    baseDate: MomentLike,
    days: number,
  ): Promise<TimelinePostsPage> => {
    const { entries, hasMore, lastSearchedDate } = searchPeriodicDayWindow({
      shell,
      activeTopic: topicId,
      baseDate,
      days,
    });

    if (entries.length === 0) {
      return {
        posts: [],
        paths: new Set(),
        hasMore,
        lastSearchedDate,
      };
    }

    const posts = (
      await Promise.all(
        entries.map(({ file, dayDate }) =>
          parsePostsFromFile(file, dayDate, readFile),
        ),
      )
    ).flat();

    return {
      posts,
      paths: new Set(entries.map((entry) => entry.file.path)),
      hasMore,
      lastSearchedDate,
    };
  };
}
