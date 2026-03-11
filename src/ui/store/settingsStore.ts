import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { 
  DateFilter, 
  DisplayMode, 
  Granularity, 
  MomentLike, 
  TimeFilter 
} from "src/ui/types";
import { granularityConfig } from "src/ui/config/granularity-config";
import { MFDIStorage } from "src/utils/storage";
import { Settings } from "src/settings";

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
  granularity: "day" as Granularity,
  date: window.moment(),
  timeFilter: "all" as TimeFilter,
  dateFilter: "today" as DateFilter,
  sidebarOpen: true,
  displayMode: "focus" as DisplayMode,
  asTask: false,

  setActiveTopic: (topicId) => {
    set({ activeTopic: topicId });
  },

  setGranularity: (g) => {
    set({ granularity: g });
    if (g !== "day") {
      set({ displayMode: "focus" });
    }
    persist("granularity", g);
    persist("displayMode", get().displayMode);
  },

  setDate: (d) => {
    set({ date: d });
    persist("date", d.toISOString());
  },

  setTimeFilter: (f) => {
    set({ timeFilter: f });
    persist("timeFilter", f);
  },

  setDateFilter: (f) => {
    set({ dateFilter: f });
    set({ displayMode: "focus" });
    persist("dateFilter", f);
    persist("displayMode", "focus");
  },

  setSidebarOpen: (o) => {
    set({ sidebarOpen: o });
    persist("sidebarOpen", o);
  },

  setDisplayMode: (m) => {
    set({ displayMode: m });
    persist("displayMode", m);
  },

  setAsTask: (asTask) => {
    set({ asTask: asTask });
    persist("asTask", asTask);
  },

  handleClickHome: () => {
    const now = window.moment();
    set({
      displayMode: "focus",
      granularity: "day",
      dateFilter: "today",
      timeFilter: "all",
      asTask: false,
      date: now,
    });
    // Persist all
    persist("displayMode", "focus");
    persist("granularity", "day");
    persist("dateFilter", "today");
    persist("timeFilter", "all");
    persist("asTask", false);
    persist("date", now.toISOString());
  },

  handleClickToday: () => {
    const now = window.moment();
    set({ date: now, displayMode: "focus" });
    persist("date", now.toISOString());
    persist("displayMode", "focus");
  },

  getMoveStep: () => {
    const { displayMode, granularity, dateFilter } = get();
    if (displayMode === "timeline") return 1;
    if (granularity !== "day") return 1;
    if (dateFilter === "this_week") return 7;
    const days = parseInt(dateFilter);
    return isNaN(days) ? 1 : days;
  },

  handleClickMovePrevious: () => {
    const { date, granularity, getMoveStep } = get();
    const step = getMoveStep();
    const nextDate = date.clone().subtract(step, granularityConfig[granularity].unit);
    set({ date: nextDate, displayMode: "focus" });
    persist("date", nextDate.toISOString());
    persist("displayMode", "focus");
  },

  handleClickMoveNext: () => {
    const { date, granularity, getMoveStep } = get();
    const step = getMoveStep();
    const nextDate = date.clone().add(step, granularityConfig[granularity].unit);
    set({ date: nextDate, displayMode: "focus" });
    persist("date", nextDate.toISOString());
    persist("displayMode", "focus");
  },

  handleChangeCalendarDate: (value: string) => {
    const { granularity } = get();
    const nextDate = granularityConfig[granularity].parseInput(value);
    set({ date: nextDate, displayMode: "focus" });
    persist("date", nextDate.toISOString());
    persist("displayMode", "focus");
  },

  isToday: () => {
    const { date, granularity } = get();
    return date.isSame(window.moment(), granularityConfig[granularity].unit);
  },

  isReadOnly: () => {
    const { date, granularity } = get();
    return date.isBefore(window.moment(), granularityConfig[granularity].unit);
  },
}));

// ─────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────

export function initializeSettingsStore(settings: Settings, storage: MFDIStorage) {
  _storage = storage;

  const savedOffset = storage.get<number | null>("editingPostOffset", null);
  
  const granularity = savedOffset !== null 
    ? storage.get<Granularity>("editingPostGranularity", "day")
    : storage.get<Granularity>("granularity", "day");

  let savedDate = savedOffset !== null 
    ? storage.get<string | null>("editingPostDate", null)
    : storage.get<string | null>("date", null);
  
  const date = savedDate ? window.moment(savedDate) : window.moment();
  const validDate = date.isValid() ? date : window.moment();

  settingsStore.setState({
    activeTopic: settings.activeTopic ?? "",
    granularity: granularity,
    date: validDate,
    timeFilter: storage.get<TimeFilter>("timeFilter", "all"),
    dateFilter: storage.get<DateFilter>("dateFilter", "today"),
    sidebarOpen: storage.get<boolean>("sidebarOpen", true),
    displayMode: storage.get<DisplayMode>("displayMode", "focus"),
    asTask: storage.get<boolean>("asTask", false),
  });
}

// ─────────────────────────────────────────────────────────────────
// React Hook
// ─────────────────────────────────────────────────────────────────

export function useSettingsStore<T>(selector: (state: SettingsState) => T): T {
  return useStore(settingsStore, selector);
}
