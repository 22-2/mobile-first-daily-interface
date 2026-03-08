import { TFile } from "obsidian";

export function handleThisWeekSyncOnSubmit({
  timeFilter,
  currentDailyNote,
  activeTopic,
  updatePostsForWeek,
  setWeekNotePaths,
}: {
  timeFilter: string | number;
  currentDailyNote: TFile | null;
  activeTopic: string;
  updatePostsForWeek: (topicId: string) => Promise<Set<string>>;
  setWeekNotePaths: (paths: Set<string>) => void;
}) {
  if (timeFilter === "this_week" && !currentDailyNote) {
    updatePostsForWeek(activeTopic).then((paths) => {
      setWeekNotePaths(paths);
    });
  }
}
