import { ChangeEvent, useCallback } from "react";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

/**
 * 閲覧設定（トピック、期間、日付、フィルター）を管理するHook。
 * 値の永続化とカレンダー操作のハンドラを提供します。
 */
export function useMFDISettings() {
  const state = useSettingsStore(useShallow((s) => ({
    activeTopic: s.activeTopic,
    setActiveTopic: s.setActiveTopic,
    granularity: s.granularity,
    setGranularity: s.setGranularity,
    date: s.date,
    setDate: s.setDate,
    timeFilter: s.timeFilter,
    setTimeFilter: s.setTimeFilter,
    dateFilter: s.dateFilter,
    setDateFilter: s.setDateFilter,
    sidebarOpen: s.sidebarOpen,
    setSidebarOpen: s.setSidebarOpen,
    displayMode: s.displayMode,
    setDisplayMode: s.setDisplayMode,
    asTask: s.asTask,
    setAsTask: s.setAsTask,
    handleChangeCalendarDateAction: s.handleChangeCalendarDate,
    handleClickMovePrevious: s.handleClickMovePrevious,
    handleClickMoveNext: s.handleClickMoveNext,
    handleClickToday: s.handleClickToday,
    handleClickHome: s.handleClickHome,
    isToday: s.isToday(),
    isReadOnly: s.isReadOnly(),
    getMoveStep: s.getMoveStep,
  })));

  const handleChangeCalendarDate = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      state.handleChangeCalendarDateAction(event.target.value);
    },
    [state.handleChangeCalendarDateAction],
  );

  return {
    ...state,
    handleChangeCalendarDate,
    setActiveTopic: state.setActiveTopic, // 下位互換性のため
  };
}
