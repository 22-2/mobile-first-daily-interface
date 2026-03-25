export const TIME_FILTER_OPTIONS = [
  { id: "all", label: "すべて" },
  { id: "latest", label: "最新のみ" },
  { id: "1h", label: "直近1時間" },
  { id: "2h", label: "直近2時間" },
  { id: "3h", label: "直近3時間" },
  { id: "6h", label: "直近6時間" },
  { id: "12h", label: "直近12時間" },
] as const;

export const DATE_FILTER_OPTIONS = [
  { id: "all", label: "すべて" },
  { id: "today", label: "今日のみ" },
  { id: "this_week", label: "今週" },
  { id: "3d", label: "過去3日間" },
  { id: "5d", label: "過去5日間" },
  { id: "7d", label: "過去7日間" },
] as const;

export const TIME_FILTER_IDS = {
  ALL: "all",
  LATEST: "latest",
  "1H": "1h",
  "2H": "2h",
  "3H": "3h",
  "6H": "6h",
  "12H": "12h",
} as const;

export const DATE_FILTER_IDS = {
  TODAY: "today",
  THIS_WEEK: "this_week",
  "3D": "3d",
  "5D": "5d",
  "7D": "7d",
} as const;
