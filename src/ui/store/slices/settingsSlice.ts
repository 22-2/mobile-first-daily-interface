import type { Settings } from "src/settings";
import {
  DISPLAY_MODE,
  INPUT_AREA_SIZE,
  MOVE_STEP,
  STORAGE_KEYS,
} from "src/ui/config/consntants";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/ui/config/filter-config";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import type { MFDIStore, SettingsSlice } from "src/ui/store/slices/types";
import type {
  DateFilter,
  DisplayMode,
  Granularity,
  InputAreaSize,
  MomentLike,
  TimeFilter,
} from "src/ui/types";
import { isTimelineView } from "src/ui/utils/view-mode";
import type { StateCreator } from "zustand/vanilla";

export const DEFAULT_VIEW_STATE = {
  displayMode: DISPLAY_MODE.TIMELINE,
  granularity: GRANULARITY_CONFIG.day.unit,
  dateFilter: DATE_FILTER_IDS.TODAY,
  timeFilter: TIME_FILTER_IDS.ALL,
  asTask: false,
  threadOnly: false,
  activeTag: null,
  threadFocusRootId: null,
} as const;

function persistValue(state: MFDIStore, key: string, value: unknown) {
  state.storage?.set(key, value);
}

export function isPastDateReadOnly(params: {
  date: MomentLike;
  granularity: Granularity;
  allowEditingPastNotes: boolean;
}) {
  const { date, granularity, allowEditingPastNotes } = params;
  if (allowEditingPastNotes) return false;
  return date.isBefore(window.moment(), GRANULARITY_CONFIG[granularity].unit);
}

export function isViewReadOnly(params: {
  date: MomentLike;
  granularity: Granularity;
  displayMode: DisplayMode;
  allowEditingPastNotes: boolean;
  noteMode?: "periodic" | "fixed";
}) {
  const {
    date,
    granularity,
    displayMode,
    allowEditingPastNotes,
    noteMode = "periodic",
  } = params;
  if (noteMode === "fixed") return false;
  if (isTimelineView(displayMode)) return false;
  return isPastDateReadOnly({ date, granularity, allowEditingPastNotes });
}

function resolveInitialSettingsState(
  settings: Settings,
  storage: MFDIStore["storage"],
) {
  // 編集中投稿が復元できる場合はその粒度・日付を優先する
  const editingPost =
    storage?.get<{
      offset: number;
      granularity: string;
      noteDateStr: string;
    } | null>(STORAGE_KEYS.EDITING_POST, null) ?? null;

  const granularity =
    editingPost !== null
      ? (editingPost.granularity as Granularity)
      : (storage?.get<Granularity>(
          STORAGE_KEYS.GRANULARITY,
          GRANULARITY_CONFIG.day.unit,
        ) ?? GRANULARITY_CONFIG.day.unit);

  const savedDate =
    editingPost !== null
      ? editingPost.noteDateStr
      : (storage?.get<string | null>(STORAGE_KEYS.DATE, null) ?? null);

  const date = savedDate ? window.moment(savedDate) : window.moment();
  const validDate = date.isValid() ? date : window.moment();

  return {
    activeTopic: settings.activeTopic ?? "",
    activeTag:
      storage?.get<string | null>(STORAGE_KEYS.ACTIVE_TAG, null) ?? null,
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
    sidebarOpen:
      storage?.get<boolean>(STORAGE_KEYS.SIDEBAR_OPEN, false) ?? false,
    displayMode:
      storage?.get<DisplayMode>(
        STORAGE_KEYS.DISPLAY_MODE,
        DISPLAY_MODE.TIMELINE,
      ) ?? (DISPLAY_MODE.TIMELINE as DisplayMode),
    asTask: storage?.get<boolean>(STORAGE_KEYS.AS_TASK, false) ?? false,
    threadOnly: false,
    searchQuery: "",
    threadFocusRootId:
      storage?.get<string | null>(STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null) ??
      null,
    inputAreaSize:
      storage?.get<InputAreaSize>(
        STORAGE_KEYS.INPUT_AREA_SIZE,
        INPUT_AREA_SIZE.DEFAULT,
      ) ?? INPUT_AREA_SIZE.DEFAULT,
  };
}

export const createSettingsSlice: StateCreator<
  MFDIStore,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  activeTopic: "",
  activeTag: null,
  granularity: GRANULARITY_CONFIG.day.unit,
  date: window.moment(),
  timeFilter: TIME_FILTER_IDS.ALL,
  dateFilter: DATE_FILTER_IDS.TODAY,
  // 初回描画でチラつきを防ぐため、初期は閉じておく
  sidebarOpen: false,
  displayMode: DISPLAY_MODE.TIMELINE as DisplayMode,
  asTask: false,
  threadOnly: false,
  searchQuery: "",
  threadFocusRootId: null,
  inputAreaSize: INPUT_AREA_SIZE.DEFAULT,

  setInputAreaSize: (size) => {
    set({ inputAreaSize: size });
    persistValue(get(), STORAGE_KEYS.INPUT_AREA_SIZE, size);
  },

  setActiveTopic: (activeTopic) => {
    set({ activeTopic, threadFocusRootId: null });
    persistValue(get(), STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setActiveTag: (activeTag) => {
    set({ activeTag });
    persistValue(get(), STORAGE_KEYS.ACTIVE_TAG, activeTag);
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
    set({
      dateFilter,
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE_FILTER, dateFilter);
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
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

  setThreadOnly: (threadOnly) => {
    // 検索UIからの絞り込み状態を明示管理し、見た目と実際の抽出条件を常に一致させる。
    set({ threadOnly });
  },

  setThreadFocusRootId: (threadFocusRootId, focusDate) => {
    set((state) => ({
      threadFocusRootId,
      date:
        threadFocusRootId !== null && focusDate != null
          ? focusDate.clone()
          : state.date,
      displayMode:
        threadFocusRootId !== null ? DISPLAY_MODE.FOCUS : state.displayMode,
    }));
    const state = get();
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, threadFocusRootId);
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, state.displayMode);
    if (threadFocusRootId !== null && focusDate != null) {
      persistValue(state, STORAGE_KEYS.DATE, state.date.toISOString());
    }
  },

  handleClickHome: () => {
    const now = window.moment();
    set({ ...DEFAULT_VIEW_STATE, date: now });
    const state = get();
    persistValue(
      state,
      STORAGE_KEYS.DISPLAY_MODE,
      DEFAULT_VIEW_STATE.displayMode,
    );
    persistValue(
      state,
      STORAGE_KEYS.GRANULARITY,
      DEFAULT_VIEW_STATE.granularity,
    );
    persistValue(
      state,
      STORAGE_KEYS.DATE_FILTER,
      DEFAULT_VIEW_STATE.dateFilter,
    );
    persistValue(
      state,
      STORAGE_KEYS.TIME_FILTER,
      DEFAULT_VIEW_STATE.timeFilter,
    );
    persistValue(state, STORAGE_KEYS.AS_TASK, DEFAULT_VIEW_STATE.asTask);
    persistValue(state, STORAGE_KEYS.DATE, now.toISOString());
    persistValue(
      state,
      STORAGE_KEYS.THREAD_FOCUS_ROOT_ID,
      DEFAULT_VIEW_STATE.threadFocusRootId,
    );
    persistValue(state, STORAGE_KEYS.ACTIVE_TAG, DEFAULT_VIEW_STATE.activeTag);
  },

  handleClickToday: () => {
    const now = window.moment();
    set({
      date: now,
      displayMode: DISPLAY_MODE.TIMELINE,
      threadFocusRootId: null,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, now.toISOString());
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.TIMELINE);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  getMoveStep: () => {
    const { displayMode, granularity, dateFilter } = get();
    if (isTimelineView(displayMode)) return MOVE_STEP.DEFAULT;
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
    set({
      date: nextDate,
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
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
    set({
      date: nextDate,
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, nextDate.toISOString());
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  handleChangeCalendarDate: (value) => {
    const { granularity } = get();
    const nextDate = GRANULARITY_CONFIG[granularity].parseInput(value);
    set({
      date: nextDate,
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
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
    const { date, granularity, displayMode, pluginSettings, viewNoteMode } =
      get();
    return isViewReadOnly({
      date,
      granularity,
      displayMode,
      allowEditingPastNotes: pluginSettings?.allowEditingPastNotes ?? false,
      noteMode: viewNoteMode,
    });
  },

  isDateReadOnly: (date, granularity) => {
    const {
      granularity: activeGranularity,
      pluginSettings,
      displayMode,
      viewNoteMode,
    } = get();
    return isViewReadOnly({
      date,
      granularity: granularity ?? activeGranularity,
      displayMode,
      allowEditingPastNotes: pluginSettings?.allowEditingPastNotes ?? false,
      noteMode: viewNoteMode,
    });
  },

  getEffectiveDate: () => {
    const { date, displayMode } = get();
    return isTimelineView(displayMode) ? window.moment() : date;
  },

  hydrateSettingsState: () => {
    const { pluginSettings, storage } = get();
    if (!pluginSettings || !storage) return;
    set(resolveInitialSettingsState(pluginSettings, storage));
  },
});
