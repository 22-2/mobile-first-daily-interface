import { useQueryClient } from "@tanstack/react-query";
import { TFile } from "obsidian";
import { useCallback } from "react";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { DATE_FILTER_IDS } from "src/ui/config/filter-config";
import { useAppContext } from "src/ui/context/AppContext";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isTimelineView } from "src/ui/utils/view-mode";
import { useShallow } from "zustand/shallow";

export function useRefreshPosts() {
  const { app } = useAppContext();
  const queryClient = useQueryClient();

  const { dateFilter, activeTopic, date, displayMode } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      activeTopic: s.activeTopic,
      dateFilter: s.dateFilter,
      displayMode: s.displayMode,
    })),
  );

  const { updatePosts, updatePostsForWeek, updatePostsForDays } = usePostsStore(
    useShallow((s) => ({
      updatePosts: s.updatePosts,
      updatePostsForWeek: s.updatePostsForWeek,
      updatePostsForDays: s.updatePostsForDays,
    })),
  );

  const replacePaths = useNoteStore((s) => s.replacePaths);

  return useCallback(
    async (path?: string) => {
      // タイムラインモード: TQ キャッシュを invalidate して再フェッチを促す
      if (isTimelineView(displayMode)) {
        await queryClient.invalidateQueries({
          queryKey: ["posts", activeTopic, displayMode],
        });
        return;
      }

      if (dateFilter === DATE_FILTER_IDS.TODAY) {
        if (!path) return;
        const noteFile = app.vault.getAbstractFileByPath(path);
        if (noteFile instanceof TFile) {
          await updatePosts(noteFile);
        }
      } else if (dateFilter === DATE_FILTER_IDS.THIS_WEEK) {
        const paths = await updatePostsForWeek(activeTopic, date);
        replacePaths(paths);
      } else {
        const days = parseInt(dateFilter);
        if (!isNaN(days)) {
          const { paths } = await updatePostsForDays(activeTopic, date, days);
          replacePaths(paths);
        }
      }
    },
    [
      app.vault,
      queryClient,
      dateFilter,
      activeTopic,
      date,
      displayMode,
      updatePosts,
      updatePostsForWeek,
      updatePostsForDays,
      replacePaths,
    ],
  );
}
