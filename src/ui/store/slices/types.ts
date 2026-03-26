import { TFile } from "obsidian";
import { RefObject } from "react";
import { MFDIDatabase } from "src/db/mfdi-db";
import { Settings } from "src/settings";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { Task } from "src/core/task-text";
import { ObsidianLiveEditorRef } from "src/ui/components/editor/ObsidianLiveEditor";
import {
  DateFilter,
  DisplayMode,
  Draft,
  Granularity,
  MomentLike,
  Post,
  TimeFilter,
} from "src/ui/types";
import { MFDINoteMode } from "src/ui/view/state";
import { MFDIStorage } from "src/core/storage";

export interface EnvironmentSlice {
  shell: ObsidianAppShell | null;
  storage: MFDIStorage | null;
  db: MFDIDatabase | null;
  pluginSettings: Settings | null;
  viewNoteMode: MFDINoteMode;
  fixedNotePath: string | null;
  setAppDependencies: (shell: ObsidianAppShell) => void;
  setStorage: (storage: MFDIStorage) => void;
  setPluginSettings: (settings: Settings) => void;
  setViewContext: (params: {
    noteMode: MFDINoteMode;
    fixedNotePath: string | null;
  }) => void;
  initializeAppStore: (params: {
    shell: ObsidianAppShell;
    settings: Settings;
    storage: MFDIStorage;
  }) => void;
}

export interface SettingsSlice {
  activeTopic: string;
  activeTag: string | null;
  granularity: Granularity;
  date: MomentLike;
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  sidebarOpen: boolean;
  displayMode: DisplayMode;
  asTask: boolean;
  threadFocusRootId: string | null;
  setActiveTopic: (topicId: string) => void;
  setActiveTag: (tag: string | null) => void;
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
  updatePostsFromDB: (params: {
    topicId?: string;
    limit?: number;
  }) => Promise<void>;
  getFilteredPosts: () => Post[];
}

export interface NoteSlice {
  currentDailyNote: TFile | null;
  weekNotePaths: Set<string>;
  setCurrentDailyNote: (note: TFile | null) => void;
  updateCurrentDailyNote: (shell: ObsidianAppShell) => void;
  replacePaths: (paths: Set<string>) => void;
  addPaths: (paths: Set<string>) => void;
  clearPaths: () => void;
  createNoteWithInsertAfter: (
    shell: ObsidianAppShell,
    settings: Settings,
    targetDate?: MomentLike,
  ) => Promise<TFile | null>;
  handleClickOpenDailyNote: (
    shell: ObsidianAppShell,
    settings: Settings,
  ) => Promise<void>;
  handleChangeTopic: (topicId: string) => void;
}

export interface EditorSlice {
  inputSnapshot: string;
  editingPostOffset: number | null;
  inputRef: RefObject<ObsidianLiveEditorRef | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  syncInputSession: (v: string) => void;
  replaceInput: (v: string) => void;
  clearInput: () => void;
  getInputValue: () => string;
  setEditingPostOffset: (offset: number | null) => void;
  setInputRef: (ref: RefObject<ObsidianLiveEditorRef | null>) => void;
  setScrollContainerRef: (ref: RefObject<HTMLDivElement | null>) => void;
  startEdit: (post: Post) => void;
  cancelEdit: () => void;
  getEditingPost: (posts: Post[]) => Post | null;
  canSubmit: (posts: Post[], currentValue?: string) => boolean;
  hydrateEditorState: () => void;
}

export interface DraftSlice {
  drafts: Draft[];
  addDraft: (content: string) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
  hydrateDraftState: () => void;
}

export type MFDIStore = EnvironmentSlice &
  SettingsSlice &
  PostsSlice &
  NoteSlice &
  EditorSlice &
  DraftSlice;
