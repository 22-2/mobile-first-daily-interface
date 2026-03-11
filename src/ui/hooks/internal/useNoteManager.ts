import { useCallback, useEffect } from "react";
import { useAppContext } from "src/ui/context/AppContext";
import { noteStore, useNoteStore } from "src/ui/store/noteStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

/**
 * デイリーノートの取得、作成、トピック切り替えを管理するHook。
 */
export const useNoteManager = () => {
  const { app, settings } = useAppContext();
  const date = useSettingsStore(s => s.date);
  const granularity = useSettingsStore(s => s.granularity);
  const activeTopic = useSettingsStore(s => s.activeTopic);

  const state = useNoteStore(useShallow((s) => ({
    currentDailyNote: s.currentDailyNote,
    setCurrentDailyNote: s.setCurrentDailyNote,
    handleChangeTopic: s.handleChangeTopic,
  })));

  const updateCurrentDailyNote = useCallback(() => {
    noteStore.getState().updateCurrentDailyNote(app);
  }, [app]);

  const createNoteWithInsertAfter = useCallback((targetDate?: any) => {
    return noteStore.getState().createNoteWithInsertAfter(app, settings, targetDate);
  }, [app, settings]);

  const handleClickOpenDailyNote = useCallback(() => {
    return noteStore.getState().handleClickOpenDailyNote(app, settings);
  }, [app, settings]);

  useEffect(() => {
    updateCurrentDailyNote();
  }, [date, granularity, activeTopic, updateCurrentDailyNote]);

  return {
    ...state,
    updateCurrentDailyNote,
    createNoteWithInsertAfter,
    handleClickOpenDailyNote,
  };
};
