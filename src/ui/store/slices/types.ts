import { App, TFile } from "obsidian";
import { RefObject } from "react";
import { AppHelper, Task } from "src/app-helper";
import { Settings } from "src/settings";
import { ObsidianLiveEditorRef } from "src/ui/components/common/ObsidianLiveEditor";
import { MFDINoteMode } from "src/ui/view/state";
import {
  DateFilter,
  DisplayMode,
  Granularity,
  MomentLike,
  Post,
  TimeFilter,
} from "src/ui/types";
import { MFDIStorage } from "src/utils/storage";

export interface EnvironmentSlice {
  app: App | null;
  appHelper: AppHelper | null;
  storage: MFDIStorage | null;
  pluginSettings: Settings | null;
  viewNoteMode: MFDINoteMode;
  fixedNotePath: string | null;
  setAppDependencies: (app: App, appHelper: AppHelper) => void;
  setStorage: (storage: MFDIStorage) => void;
  setPluginSettings: (settings: Settings) => void;
  setViewContext: (params: {
    noteMode: MFDINoteMode;
    fixedNotePath: string | null;
  }) => void;
  initializeAppStore: (params: {
    app: App;
    appHelper: AppHelper;
    settings: Settings;
    storage: MFDIStorage;
  }) => void;
}

export interface SettingsSlice {
  activeTopic: string;
  granularity: Granularity;
  date: MomentLike;
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  sidebarOpen: boolean;
  displayMode: DisplayMode;
  asTask: boolean;
  threadFocusRootId: string | null;
  setActiveTopic: (topicId: string) => void;
  setGranularity: (g: Granularity) => void;
  setDate: (d: MomentLike) => void;
  setTimeFilter: (f: TimeFilter) => void;
  setDateFilter: (f: DateFilter) => void;
  setSidebarOpen: (o: boolean) => void;
  setDisplayMode: (m: DisplayMode) => void;
  setAsTask: (asTask: boolean) => void;
  setThreadFocusRootId: (rootId: string | null, focusDate?: MomentLike) => void;
  handleClickHome: () => void;
  handleClickToday: () => void;
  handleClickMovePrevious: () => void;
  handleClickMoveNext: () => void;
  handleChangeCalendarDate: (value: string) => void;
  isToday: () => boolean;
  isReadOnly: () => boolean;
  isDateReadOnly: (date: MomentLike, granularity?: Granularity) => boolean;
  getMoveStep: () => number;
  getEffectiveDate: () => MomentLike;
  hydrateSettingsState: () => void;
}

export interface PostsSlice {
  posts: Post[];
  tasks: Task[];
  setPosts: (posts: Post[]) => void;
  setTasks: (tasks: Task[]) => void;
  updatePosts: (note: TFile) => Promise<void>;
  updateTasks: (note: TFile) => Promise<void>;
  updatePostsForWeek: (
    topicId: string,
    date: MomentLike,
  ) => Promise<Set<string>>;
  updatePostsForDays: (
    topicId: string,
    date: MomentLike,
    days: number,
  ) => Promise<{
    paths: Set<string>;
    hasMore: boolean;
    lastSearchedDate: MomentLike;
  }>;
  getFilteredPosts: () => Post[];
}

export interface NoteSlice {
  currentDailyNote: TFile | null;
  weekNotePaths: Set<string>;
  setCurrentDailyNote: (note: TFile | null) => void;
  updateCurrentDailyNote: (app: App) => void;
  replacePaths: (paths: Set<string>) => void;
  addPaths: (paths: Set<string>) => void;
  clearPaths: () => void;
  createNoteWithInsertAfter: (
    app: App,
    settings: Settings,
    targetDate?: MomentLike,
  ) => Promise<TFile | null>;
  handleClickOpenDailyNote: (app: App, settings: Settings) => Promise<void>;
  handleChangeTopic: (topicId: string) => void;
}

export interface EditorSlice {
  input: string;
  editingPostOffset: number | null;
  inputRef: RefObject<ObsidianLiveEditorRef | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  setInput: (v: string) => void;
  setEditingPostOffset: (offset: number | null) => void;
  setInputRef: (ref: RefObject<ObsidianLiveEditorRef | null>) => void;
  setScrollContainerRef: (ref: RefObject<HTMLDivElement | null>) => void;
  startEdit: (post: Post) => void;
  cancelEdit: () => void;
  getEditingPost: (posts: Post[]) => Post | null;
  canSubmit: (posts: Post[]) => boolean;
  hydrateEditorState: () => void;
}

export type MFDIStore = EnvironmentSlice &
  SettingsSlice &
  PostsSlice &
  NoteSlice &
  EditorSlice;
