import type { Vault } from "obsidian";
import { mutate } from "swr";
import { TFile } from "obsidian";
import { DATE_FILTER_IDS } from "src/ui/config/filter-config";
import type { DateFilter, DisplayMode, MomentLike } from "src/ui/types";
import { isTimelineView } from "src/ui/utils/view-mode";

type UpdatePostsForDaysResult = {
  paths: Set<string>;
  hasMore: boolean;
  lastSearchedDate: MomentLike;
};

type RefreshPosts = (path?: string) => Promise<void>;

interface RefreshPostsDeps {
  vault: Vault;
  dateFilter: DateFilter;
  activeTopic: string;
  date: MomentLike;
  displayMode: DisplayMode;
  updatePosts: (note: TFile) => Promise<void>;
  updatePostsForWeek: (
    topicId: string,
    date: MomentLike,
  ) => Promise<Set<string>>;
  updatePostsForDays: (
    topicId: string,
    date: MomentLike,
    days: number,
  ) => Promise<UpdatePostsForDaysResult>;
  replacePaths: (paths: Set<string>) => void;
}

export function createRefreshPosts({
  vault,
  dateFilter,
  activeTopic,
  date,
  displayMode,
  updatePosts,
  updatePostsForWeek,
  updatePostsForDays,
  replacePaths,
}: Omit<RefreshPostsDeps, "queryClient">): RefreshPosts {
  return async (path?: string) => {
    if (isTimelineView(displayMode)) {
      await mutate(
        (key) =>
          Array.isArray(key) &&
          key[0] === "posts" &&
          key[1] === activeTopic &&
          key[2] === displayMode,
      );
      return;
    }

    if (dateFilter === DATE_FILTER_IDS.TODAY) {
      if (!path) return;
      const noteFile = vault.getAbstractFileByPath(path);
      if (noteFile instanceof TFile) {
        await updatePosts(noteFile);
      }
      return;
    }

    if (dateFilter === DATE_FILTER_IDS.THIS_WEEK) {
      const paths = await updatePostsForWeek(activeTopic, date);
      replacePaths(paths);
      return;
    }

    const days = parseInt(dateFilter, 10);
    if (Number.isNaN(days)) return;

    const { paths } = await updatePostsForDays(activeTopic, date, days);
    replacePaths(paths);
  };
}
