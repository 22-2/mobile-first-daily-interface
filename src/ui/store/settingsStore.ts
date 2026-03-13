import { Settings } from "src/settings";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import {
    DateFilter,
    DisplayMode,
    Granularity,
    MomentLike,
    TimeFilter
} from "src/ui/types";
import { MFDIStorage } from "src/utils/storage";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { DISPLAY_MODE, MOVE_STEP, STORAGE_KEYS } from "src/ui/config/consntants";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "../config/filter-config";

interface SettingsState {
  activeTopic: string;
  granularity: Granularity;
  date: MomentLike;
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  sidebarOpen: boolean;
  displayMode: DisplayMode;
  asTask: boolean;

  // Actions
  setActiveTopic: (topicId: string) => void;
  setGranularity: (g: Granularity) => void;
  setDate: (d: MomentLike) => void;
  setTimeFilter: (f: TimeFilter) => void;
  setDateFilter: (f: DateFilter) => void;
  setSidebarOpen: (o: boolean) => void;
  setDisplayMode: (m: DisplayMode) => void;
  setAsTask: (asTask: boolean) => void;

  // Complex Actions
  handleClickHome: () => void;
  handleClickToday: () => void;
  handleClickMovePrevious: () => void;
  handleClickMoveNext: () => void;
  handleChangeCalendarDate: (value: string) => void;
  
  // Helpers (getters equivalent)
  isToday: () => boolean;
  isReadOnly: () => boolean;
  getMoveStep: () => number;
  getEffectiveDate: () => MomentLike;
}

// ─────────────────────────────────────────────────────────────────
// Persistence Helper
// ─────────────────────────────────────────────────────────────────

let _storage: MFDIStorage | null = null;

const persist = (key: string, value: any) => {
  if (_storage) {
    _storage.set(key, value);
  }
};

// ─────────────────────────────────────────────────────────────────
// Define Store
// ─────────────────────────────────────────────────────────────────

export const settingsStore = createStore<SettingsState>((set, get) => ({
  activeTopic: "",
  granularity: GRANULARITY_CONFIG.day.unit,
  date: window.moment(),
  timeFilter: TIME_FILTER_IDS.ALL,
  dateFilter: DATE_FILTER_IDS.TODAY,
  sidebarOpen: true,
  displayMode: DISPLAY_MODE.FOCUS as DisplayMode,
  asTask: false,

  setActiveTopic: (topicId) => {
    set({ activeTopic: topicId });
  },

  setGranularity: (g) => {
    set({ granularity: g });
    if (g !== GRANULARITY_CONFIG.day.unit) {
      set({ displayMode: DISPLAY_MODE.FOCUS });
    }
    persist(STORAGE_KEYS.GRANULARITY, g);
    persist(STORAGE_KEYS.DISPLAY_MODE, get().displayMode);
  },

  setDate: (d) => {
    set({ date: d });
    persist(STORAGE_KEYS.DATE, d.toISOString());
  },

  setTimeFilter: (f) => {
    set({ timeFilter: f });
    persist(STORAGE_KEYS.TIME_FILTER, f);
  },

  setDateFilter: (f) => {
    set({ dateFilter: f });
    set({ displayMode: DISPLAY_MODE.FOCUS });
    persist(STORAGE_KEYS.DATE_FILTER, f);
    persist(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
  },

  setSidebarOpen: (o) => {
    set({ sidebarOpen: o });
    persist(STORAGE_KEYS.SIDEBAR_OPEN, o);
  },

  setDisplayMode: (m) => {
    set({ displayMode: m });
    persist(STORAGE_KEYS.DISPLAY_MODE, m);
  },

  setAsTask: (asTask) => {
    set({ asTask: asTask });
    persist(STORAGE_KEYS.AS_TASK, asTask);
  },

  handleClickHome: () => {
    const now = window.moment();
    set({
      displayMode: DISPLAY_MODE.TIMELINE,
      granularity: GRANULARITY_CONFIG.day.unit,
      dateFilter: DATE_FILTER_IDS.TODAY,
      timeFilter: TIME_FILTER_IDS.ALL,
      asTask: false,
      date: now,
    });
    // Persist all
    persist(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.TIMELINE);
    persist(STORAGE_KEYS.GRANULARITY, GRANULARITY_CONFIG.day.unit);
    persist(STORAGE_KEYS.DATE_FILTER, DATE_FILTER_IDS.TODAY);
    persist(STORAGE_KEYS.TIME_FILTER, TIME_FILTER_IDS.ALL);
    persist(STORAGE_KEYS.AS_TASK, false);
    persist(STORAGE_KEYS.DATE, now.toISOString());
  },

  handleClickToday: () => {
    const now = window.moment();
    set({ date: now, displayMode: DISPLAY_MODE.TIMELINE });
    persist(STORAGE_KEYS.DATE, now.toISOString());
    persist(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.TIMELINE);
  },

  getMoveStep: () => {
    const { displayMode, granularity, dateFilter } = get();
    if (displayMode === DISPLAY_MODE.TIMELINE) return MOVE_STEP.DEFAULT;
    if (granularity !== GRANULARITY_CONFIG.day.unit) return MOVE_STEP.DEFAULT;
    if (dateFilter === DATE_FILTER_IDS.THIS_WEEK) return MOVE_STEP.WEEK;
    const days = parseInt(dateFilter);
    return isNaN(days) ? MOVE_STEP.DEFAULT : days;
  },

  handleClickMovePrevious: () => {
    const { date, granularity, getMoveStep } = get();
    const step = getMoveStep();
    const nextDate = date.clone().subtract(step, GRANULARITY_CONFIG[granularity].unit);
    set({ date: nextDate, displayMode: DISPLAY_MODE.FOCUS });
    persist(STORAGE_KEYS.DATE, nextDate.toISOString());
    persist(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
  },

  handleClickMoveNext: () => {
    const { date, granularity, getMoveStep } = get();
    const step = getMoveStep();
    const nextDate = date.clone().add(step, GRANULARITY_CONFIG[granularity].unit);
    set({ date: nextDate, displayMode: DISPLAY_MODE.FOCUS });
    persist(STORAGE_KEYS.DATE, nextDate.toISOString());
    persist(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
  },

  handleChangeCalendarDate: (value: string) => {
    const { granularity } = get();
    const nextDate = GRANULARITY_CONFIG[granularity].parseInput(value);
    set({ date: nextDate, displayMode: DISPLAY_MODE.FOCUS });
    persist(STORAGE_KEYS.DATE, nextDate.toISOString());
    persist(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
  },

  isToday: () => {
    const { date, granularity } = get();
    return date.isSame(window.moment(), GRANULARITY_CONFIG[granularity].unit);
  },

  isReadOnly: () => {
    const { date, granularity, displayMode } = get();
    // タイムライン表示のときは常に最新日に書き込みできるようにする（閲覧専用にしない）
    if (displayMode === DISPLAY_MODE.TIMELINE) return false;
    return date.isBefore(window.moment(), GRANULARITY_CONFIG[granularity].unit);
  },

  getEffectiveDate: () => {
    const { date, displayMode } = get();
    // タイムライン表示時は常に今日を返す
    return displayMode === DISPLAY_MODE.TIMELINE ? window.moment() : date;
  },
}));

// ─────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────

export function initializeSettingsStore(settings: Settings, storage: MFDIStorage) {
  _storage = storage;

  const savedOffset = storage.get<number | null>(STORAGE_KEYS.EDITING_POST_OFFSET, null);
  
  const granularity = savedOffset !== null 
    ? storage.get<Granularity>(STORAGE_KEYS.EDITING_POST_GRANULARITY, GRANULARITY_CONFIG.day.unit)
    : storage.get<Granularity>(STORAGE_KEYS.GRANULARITY, GRANULARITY_CONFIG.day.unit);

  let savedDate = savedOffset !== null 
    ? storage.get<string | null>(STORAGE_KEYS.EDITING_POST_DATE, null)
    : storage.get<string | null>(STORAGE_KEYS.DATE, null);
  
  const date = savedDate ? window.moment(savedDate) : window.moment();
  const validDate = date.isValid() ? date : window.moment();

  settingsStore.setState({
    activeTopic: settings.activeTopic ?? "",
    granularity: granularity,
    date: validDate,
    timeFilter: storage.get<TimeFilter>(STORAGE_KEYS.TIME_FILTER, TIME_FILTER_IDS.ALL),
    dateFilter: storage.get<DateFilter>(STORAGE_KEYS.DATE_FILTER, DATE_FILTER_IDS.TODAY),
    sidebarOpen: storage.get<boolean>(STORAGE_KEYS.SIDEBAR_OPEN, true),
    displayMode: storage.get<DisplayMode>(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS),
    asTask: storage.get<boolean>(STORAGE_KEYS.AS_TASK, false),
  });
}

// ─────────────────────────────────────────────────────────────────
// React Hook
// ─────────────────────────────────────────────────────────────────

export function useSettingsStore<T>(selector: (state: SettingsState) => T): T {
  return useStore(settingsStore, selector);
}
