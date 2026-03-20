import { App, TFile } from "obsidian";
import { MomentLike, Post } from "src/ui/types";
import { resolveTimestamp } from "src/ui/utils/post-utils";
import { buildPostFromEntry } from "src/ui/utils/thread-utils";
import { getAllTopicNotes, getDateUID } from "src/utils/daily-notes";
import { parseThinoEntries } from "src/utils/thino";

export type TimelinePostsPage = {
  posts: Post[];
  paths: Set<string>;
  hasMore: boolean;
  lastSearchedDate: MomentLike;
};

export interface CreateTimelinePageFetcherDeps {
  app: App;
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
  app,
  readFile,
}: CreateTimelinePageFetcherDeps) {
  return async (
    topicId: string,
    baseDate: MomentLike,
    days: number,
  ): Promise<TimelinePostsPage> => {
    const allTopicNotes = getAllTopicNotes(app, "day", topicId);
    const uids = Object.keys(allTopicNotes).toSorted();

    if (uids.length === 0) {
      return {
        posts: [],
        paths: new Set(),
        hasMore: false,
        lastSearchedDate: baseDate,
      };
    }

    const oldestDate = window.moment(uids[0].substring("day-".length));
    const windowStart = baseDate.clone().startOf("day");
    const windowDates = Array.from({ length: days }, (_, index) =>
      windowStart.clone().subtract(index, "days"),
    );
    const windowEnd = windowDates[windowDates.length - 1];

    const entries = windowDates
      .map((dayDate) => ({
        file: allTopicNotes[getDateUID(dayDate, "day")] ?? null,
        dayDate,
      }))
      .filter(
        (entry): entry is { file: TFile; dayDate: MomentLike } =>
          entry.file !== null,
      );

    if (entries.length === 0 && windowEnd.isAfter(oldestDate)) {
      const windowEndUid = getDateUID(windowEnd, "day");
      const nextUid = uids
        .slice()
        .reverse()
        .find((uid) => uid < windowEndUid);
      if (nextUid) {
        return createTimelinePageFetcher({ app, readFile })(
          topicId,
          window.moment(nextUid.substring("day-".length)),
          days,
        );
      }
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
      hasMore: windowEnd.isAfter(oldestDate),
      lastSearchedDate: windowEnd,
    };
  };
}
