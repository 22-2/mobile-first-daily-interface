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
  INPUT_PERIODIC: "inputPeriodic",
  INPUT_FIXED: "inputFixed",
  // 編集中投稿のセッション情報を1オブジェクトにまとめて保存する
  EDITING_POST: "editingPost",
  THREAD_FOCUS_ROOT_ID: "threadFocusRootId",
  COLLAPSED_POST_GROUP_KEYS: "collapsedPostGroupKeys",
  EXPANDED: "expanded",
} as const;

export const MOVE_STEP = {
  DEFAULT: 1,
  WEEK: 7,
} as const;
