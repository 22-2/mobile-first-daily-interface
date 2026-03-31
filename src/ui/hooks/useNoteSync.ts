import { TFile } from "obsidian";
import { useEffect } from "react";
import { mutate } from "swr";
import { resolveNoteSource } from "src/core/note-source";
import { useAppStore, useCurrentAppStore } from "src/ui/store/appStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isTimelineView } from "src/ui/utils/view-mode";
import { useShallow } from "zustand/shallow";

export function useNoteSync() {
  const shell = useAppStore((s) => s.shell);
  const store = useCurrentAppStore();

  const { date, granularity, activeTopic, dateFilter, displayMode, setDate } =
    useSettingsStore(
      useShallow((s) => ({
        date: s.date,
        granularity: s.granularity,
        activeTopic: s.activeTopic,
        dateFilter: s.dateFilter,
        displayMode: s.displayMode,
        setDate: s.setDate,
      })),
    );

  const { viewNoteMode, fixedNotePath } = useSettingsStore(
    useShallow((s) => ({
      viewNoteMode: s.viewNoteMode,
      fixedNotePath: s.fixedNotePath,
    })),
  );

  const { currentDailyNote, weekNotePaths } = useNoteStore(
    useShallow((s) => ({
      currentDailyNote: s.currentDailyNote,
      weekNotePaths: s.weekNotePaths,
    })),
  );

  const { setTasks, updateTasks } = usePostsStore(
    useShallow((s) => ({
      setTasks: s.setTasks,
      updateTasks: s.updateTasks,
    })),
  );

  useEffect(() => {
    if (!shell) return;

    const noteSource = resolveNoteSource({
      shell,
      date,
      granularity,
      activeTopic,
      noteMode: viewNoteMode,
      fixedNotePath,
    });

    const refreshPosts = async () => {
      // 全ての 'posts' に関連するキャッシュを再検証
      await mutate((key) => Array.isArray(key) && key[0] === "posts");
    };

    const handleChanged = async (file: TFile) => {
      const isMultiDayOrTimeline =
        dateFilter !== "today" || isTimelineView(displayMode);

      if (noteSource.mode === "periodic" && isMultiDayOrTimeline) {
        if (isTimelineView(displayMode) || weekNotePaths.has(file.path)) {
          await refreshPosts();
        }
        return;
      }

      if (!noteSource.matchesPath(file.path, currentDailyNote)) return;

      store.getState().updateCurrentDailyNote(shell);
      await Promise.all([refreshPosts(), updateTasks(file)]);
    };

    const handleDelete = async (file: { path: string }) => {
      if (noteSource.mode === "fixed") {
        if (!noteSource.matchesPath(file.path, currentDailyNote)) return;
        store.getState().setCurrentDailyNote(null);
        setTasks([]);
        return;
      }

      if (isTimelineView(displayMode) || weekNotePaths.has(file.path)) {
        await refreshPosts();
      }

      if (file.path !== currentDailyNote?.path) return;
      setDate(date.clone());
      setTasks([]);
    };

    const changedRef = shell.getMetadataCache().on("changed", handleChanged);
    const deleteRef = shell.getVault().on("delete", handleDelete);
    const createRef = shell.getVault().on("create", (file) => {
      if (file instanceof TFile) handleChanged(file);
    });

    return () => {
      shell.getMetadataCache().offref(changedRef);
      shell.getVault().offref(deleteRef);
      shell.getVault().offref(createRef);
    };
  }, [
    shell,
    date,
    granularity,
    activeTopic,
    dateFilter,
    displayMode,
    setDate,
    viewNoteMode,
    fixedNotePath,
    currentDailyNote,
    weekNotePaths,
    setTasks,
    updateTasks,
    store,
  ]);
}
