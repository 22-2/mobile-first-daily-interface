import { useEffect } from "react";
import { useNoteStore } from "src/ui/store/noteStore";
import { useShallow } from "zustand/shallow";
import { useAppContext } from "src/ui/context/AppContext";
import { useSettingsStore } from "src/ui/store/settingsStore";

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
    updateCurrentDailyNote: () => s.updateCurrentDailyNote(app),
    createNoteWithInsertAfter: (targetDate?: any) => s.createNoteWithInsertAfter(app, settings, targetDate),
    handleClickOpenDailyNote: () => s.handleClickOpenDailyNote(app, settings),
    handleChangeTopic: s.handleChangeTopic,
  })));

  useEffect(() => {
    state.updateCurrentDailyNote();
  }, [date, granularity, activeTopic, state.updateCurrentDailyNote]);

  return state;
};
