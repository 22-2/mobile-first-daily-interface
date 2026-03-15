import { Settings } from "src/settings";
import {
    DISPLAY_MODE,
    MOVE_STEP,
    STORAGE_KEYS
} from "src/ui/config/consntants";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/ui/config/filter-config";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { DateFilter, DisplayMode, Granularity, TimeFilter } from "src/ui/types";
import { StateCreator } from "zustand/vanilla";
import { MFDIStore, SettingsSlice } from "./types";

function persistValue(state: MFDIStore, key: string, value: unknown) {
  state.storage?.set(key, value);
}

function resolveInitialSettingsState(
  settings: Settings,
  storage: MFDIStore["storage"],
) {
  const savedOffset =
    storage?.get<number | null>(STORAGE_KEYS.EDITING_POST_OFFSET, null) ?? null;
  const granularity =
    savedOffset !== null
      ? (storage?.get<Granularity>(
          STORAGE_KEYS.EDITING_POST_GRANULARITY,
          GRANULARITY_CONFIG.day.unit,
        ) ?? GRANULARITY_CONFIG.day.unit)
      : (storage?.get<Granularity>(
          STORAGE_KEYS.GRANULARITY,
          GRANULARITY_CONFIG.day.unit,
        ) ?? GRANULARITY_CONFIG.day.unit);

  const savedDate =
    savedOffset !== null
      ? (storage?.get<string | null>(STORAGE_KEYS.EDITING_POST_DATE, null) ??
        null)
      : (storage?.get<string | null>(STORAGE_KEYS.DATE, null) ?? null);

  const date = savedDate ? window.moment(savedDate) : window.moment();
  const validDate = date.isValid() ? date : window.moment();

  return {
    activeTopic: settings.activeTopic ?? "",
    granularity,
    date: validDate,
    timeFilter:
      storage?.get<TimeFilter>(STORAGE_KEYS.TIME_FILTER, TIME_FILTER_IDS.ALL) ??
      TIME_FILTER_IDS.ALL,
    dateFilter:
      storage?.get<DateFilter>(
        STORAGE_KEYS.DATE_FILTER,
        DATE_FILTER_IDS.TODAY,
      ) ?? DATE_FILTER_IDS.TODAY,
    sidebarOpen: storage?.get<boolean>(STORAGE_KEYS.SIDEBAR_OPEN, true) ?? true,
    displayMode:
      storage?.get<DisplayMode>(
        STORAGE_KEYS.DISPLAY_MODE,
        DISPLAY_MODE.FOCUS,
      ) ?? (DISPLAY_MODE.FOCUS as DisplayMode),
    asTask: storage?.get<boolean>(STORAGE_KEYS.AS_TASK, false) ?? false,
    threadFocusRootId:
      storage?.get<string | null>(STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null) ??
      null,
  };
}

export const createSettingsSlice: StateCreator<
  MFDIStore,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  activeTopic: "",
  granularity: GRANULARITY_CONFIG.day.unit,
  date: window.moment(),
  timeFilter: TIME_FILTER_IDS.ALL,
  dateFilter: DATE_FILTER_IDS.TODAY,
  sidebarOpen: true,
  displayMode: DISPLAY_MODE.FOCUS as DisplayMode,
  asTask: false,
  threadFocusRootId: null,

  setActiveTopic: (activeTopic) => {
    set({ activeTopic, threadFocusRootId: null });
    persistValue(get(), STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setGranularity: (granularity) => {
    set((state) => ({
      granularity,
      threadFocusRootId: null,
      displayMode:
        granularity !== GRANULARITY_CONFIG.day.unit
          ? DISPLAY_MODE.FOCUS
          : state.displayMode,
    }));
    const state = get();
    persistValue(state, STORAGE_KEYS.GRANULARITY, granularity);
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, state.displayMode);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setDate: (date) => {
    set({ date, threadFocusRootId: null });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, date.toISOString());
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setTimeFilter: (timeFilter) => {
    set({ timeFilter });
    persistValue(get(), STORAGE_KEYS.TIME_FILTER, timeFilter);
  },

  setDateFilter: (dateFilter) => {
    set({ dateFilter, displayMode: DISPLAY_MODE.FOCUS, threadFocusRootId: null });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE_FILTER, dateFilter);
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setSidebarOpen: (sidebarOpen) => {
    set({ sidebarOpen });
    persistValue(get(), STORAGE_KEYS.SIDEBAR_OPEN, sidebarOpen);
  },

  setDisplayMode: (displayMode) => {
    set({ displayMode, threadFocusRootId: null });
    const state = get();
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, displayMode);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setAsTask: (asTask) => {
    set({ asTask });
    persistValue(get(), STORAGE_KEYS.AS_TASK, asTask);
  },

  setThreadFocusRootId: (threadFocusRootId) => {
    set({ threadFocusRootId });
    persistValue(get(), STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, threadFocusRootId);
  },

  handleClickHome: () => {
    const now = window.moment();
    set({
      displayMode: DISPLAY_MODE.TIMELINE,
      granularity: GRANULARITY_CONFIG.day.unit,
      dateFilter: DATE_FILTER_IDS.TODAY,
      timeFilter: TIME_FILTER_IDS.ALL,
      asTask: false,
      threadFocusRootId: null,
      date: now,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.TIMELINE);
    persistValue(state, STORAGE_KEYS.GRANULARITY, GRANULARITY_CONFIG.day.unit);
    persistValue(state, STORAGE_KEYS.DATE_FILTER, DATE_FILTER_IDS.TODAY);
    persistValue(state, STORAGE_KEYS.TIME_FILTER, TIME_FILTER_IDS.ALL);
    persistValue(state, STORAGE_KEYS.AS_TASK, false);
    persistValue(state, STORAGE_KEYS.DATE, now.toISOString());
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  handleClickToday: () => {
    const now = window.moment();
    set({ date: now, displayMode: DISPLAY_MODE.TIMELINE, threadFocusRootId: null });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, now.toISOString());
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.TIMELINE);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  getMoveStep: () => {
    const { displayMode, granularity, dateFilter } = get();
    if (displayMode === DISPLAY_MODE.TIMELINE) return MOVE_STEP.DEFAULT;
    if (granularity !== GRANULARITY_CONFIG.day.unit) return MOVE_STEP.DEFAULT;
    if (dateFilter === DATE_FILTER_IDS.THIS_WEEK) return MOVE_STEP.WEEK;
    const days = Number.parseInt(dateFilter, 10);
    return Number.isNaN(days) ? MOVE_STEP.DEFAULT : days;
  },

  handleClickMovePrevious: () => {
    const { date, granularity, getMoveStep } = get();
    const step = getMoveStep();
    const nextDate = date
      .clone()
      .subtract(step, GRANULARITY_CONFIG[granularity].unit);
    set({ date: nextDate, displayMode: DISPLAY_MODE.FOCUS, threadFocusRootId: null });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, nextDate.toISOString());
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  handleClickMoveNext: () => {
    const { date, granularity, getMoveStep } = get();
    const step = getMoveStep();
    const nextDate = date
      .clone()
      .add(step, GRANULARITY_CONFIG[granularity].unit);
    set({ date: nextDate, displayMode: DISPLAY_MODE.FOCUS, threadFocusRootId: null });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, nextDate.toISOString());
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  handleChangeCalendarDate: (value) => {
    const { granularity } = get();
    const nextDate = GRANULARITY_CONFIG[granularity].parseInput(value);
    set({ date: nextDate, displayMode: DISPLAY_MODE.FOCUS, threadFocusRootId: null });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, nextDate.toISOString());
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  isToday: () => {
    const { date, granularity } = get();
    return date.isSame(window.moment(), GRANULARITY_CONFIG[granularity].unit);
  },

  isReadOnly: () => {
    const { date, granularity, displayMode } = get();
    if (displayMode === DISPLAY_MODE.TIMELINE) return false;
    return date.isBefore(window.moment(), GRANULARITY_CONFIG[granularity].unit);
  },

  getEffectiveDate: () => {
    const { date, displayMode } = get();
    return displayMode === DISPLAY_MODE.TIMELINE ? window.moment() : date;
  },

  hydrateSettingsState: () => {
    const { pluginSettings, storage } = get();
    if (!pluginSettings || !storage) return;
    set(resolveInitialSettingsState(pluginSettings, storage));
  },
});
