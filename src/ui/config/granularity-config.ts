
// ─────────────────────────────────────────────────────────────────
// UI display config — granularity ごとの表示設定

import { MomentLike, Granularity } from "src/ui/types";

export interface GranularityConfigEntry {
  label: string;
  menuLabel: string;
  todayLabel: string;
  unit: Granularity;
  inputType: string;
  inputFormat: string;
  displayFormat: string;
  parseInput: (v: string) => MomentLike;
  showWeekday: boolean;
}

export const GRANULARITY_CONFIG: Record<Granularity, GranularityConfigEntry> = {
  day: {
    label: "日",
    menuLabel: "日ごと",
    todayLabel: "今日",
    unit: "day",
    inputType: "date",
    inputFormat: "YYYY-MM-DD",
    displayFormat: "YYYY年MM月DD日",
    parseInput: (v) => window.moment(v, "YYYY-MM-DD"),
    showWeekday: true,
  },
  week: {
    label: "週",
    menuLabel: "週ごと",
    todayLabel: "今週",
    unit: "week",
    inputType: "week",
    inputFormat: "GGGG-[W]WW",
    displayFormat: "GGGG年 [W]WW週",
    parseInput: (v) => window.moment(v, "GGGG-[W]WW"),
    showWeekday: false,
  },
  month: {
    label: "月",
    menuLabel: "月ごと",
    todayLabel: "今月",
    unit: "month",
    inputType: "month",
    inputFormat: "YYYY-MM",
    displayFormat: "YYYY年MM月",
    parseInput: (v) => window.moment(v, "YYYY-MM"),
    showWeekday: false,
  },
  year: {
    label: "年",
    menuLabel: "年ごと",
    todayLabel: "今年",
    unit: "year",
    inputType: "number",
    inputFormat: "YYYY",
    displayFormat: "YYYY年",
    parseInput: (v) => window.moment(v, "YYYY"),
    showWeekday: false,
  },
};
