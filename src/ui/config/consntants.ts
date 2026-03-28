export const PLACEHOLDER_TEXT = "なんでもかいていいのよ😊";
export const READONLY_PLACEHOLDER_TEXT = "閲覧モード（書き込み不可）";
export const DISPLAY_MODE = {
  FOCUS: "focus",
  TIMELINE: "timeline",
} as const;

export const STORAGE_KEYS = {
  TOPICS: "topics",
  ACTIVE_TOPIC: "activeTopic",
  ACTIVE_TAG: "activeTag",
  TIME_FILTER: "timeFilter",
  DATE_FILTER: "dateFilter",
  SIDEBAR_OPEN: "sidebarOpen",
  GRANULARITY: "granularity",
  DATE: "date",
  DISPLAY_MODE: "displayMode",
  AS_TASK: "asTask",
  INPUT: "input",
  EDITING_POST_GRANULARITY: "editingPostGranularity",
  EDITING_POST_OFFSET: "editingPostOffset",
  EDITING_POST_DATE: "editingPostDate",
  EDITING_POST_ID: "editingPostId",
  EDITING_POST_PATH: "editingPostPath",
  EDITING_POST_TIMESTAMP: "editingPostTimestamp",
  EDITING_POST_METADATA: "editingPostMetadata",
  THREAD_FOCUS_ROOT_ID: "threadFocusRootId",
} as const;

export const MOVE_STEP = {
  DEFAULT: 1,
  WEEK: 7,
} as const;
