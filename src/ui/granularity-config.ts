import { TFile, Vault, normalizePath } from "obsidian";
import {
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
  getDailyNoteSettings,
  createWeeklyNote,
  createMonthlyNote,
  createYearlyNote,
  getWeeklyNoteSettings,
  getMonthlyNoteSettings,
  getYearlyNoteSettings,
  getDateUID,
  getDateFromFile,
  IPeriodicNoteSettings,
  DEFAULT_DAILY_NOTE_FORMAT,
  DEFAULT_WEEKLY_NOTE_FORMAT,
  DEFAULT_MONTHLY_NOTE_FORMAT,
  DEFAULT_YEARLY_NOTE_FORMAT,
} from "obsidian-daily-notes-interface";
import { Granularity, MomentLike } from "./types";

/**
 * obsidian-daily-notes-interface の getAllWeeklyNotes / getAllMonthlyNotes /
 * getAllYearlyNotes はプラグイン有効チェック（appHasWeeklyNotesPluginLoaded 等）で
 * プラグインが未設定の場合に空オブジェクトを返してしまう。
 * そのため、vault から直接フォルダを走査する独自実装を使う。
 */
function getAllNotesByGranularity(
  g: Exclude<Granularity, "day">
): Record<string, TFile> {
  const getSettings: Record<
    Exclude<Granularity, "day">,
    () => IPeriodicNoteSettings
  > = {
    week: getWeeklyNoteSettings,
    month: getMonthlyNoteSettings,
    year: getYearlyNoteSettings,
  };
  const { folder } = getSettings[g]();
  const { vault } = (window as any).app;
  const folderPath = normalizePath(folder || "/");
  const folderFile = vault.getAbstractFileByPath(folderPath);
  if (!folderFile) return {};
  const result: Record<string, TFile> = {};
  Vault.recurseChildren(folderFile, (note) => {
    if (note instanceof TFile) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const date = getDateFromFile(note as any, g);
      if (date) {
        const uid = getDateUID(date, g);
        result[uid] = note;
      }
    }
  });
  return result;
}

export const getAllNotes = (g: Granularity): Record<string, TFile> => {
  switch (g) {
    case "week":  return getAllNotesByGranularity("week");
    case "month": return getAllNotesByGranularity("month");
    case "year":  return getAllNotesByGranularity("year");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default:      return getAllDailyNotes() as any;
  }
};

export const getNote = (
  date: MomentLike,
  notes: Record<string, TFile>,
  g: Granularity
): TFile | null => {
  const uid = getDateUID(date, g);
  return notes[uid] ?? null;
};

export const createNote = (date: MomentLike, g: Granularity): Promise<TFile> => {
  switch (g) {
    case "week":  return createWeeklyNote(date) as Promise<TFile>;
    case "month": return createMonthlyNote(date) as Promise<TFile>;
    case "year":  return createYearlyNote(date) as Promise<TFile>;
    default:      return createDailyNote(date) as Promise<TFile>;
  }
};

export const getNoteSettings = (g: Granularity): IPeriodicNoteSettings => {
  switch (g) {
    case "week":  return getWeeklyNoteSettings();
    case "month": return getMonthlyNoteSettings();
    case "year":  return getYearlyNoteSettings();
    default:      return getDailyNoteSettings();
  }
};

export const granularityConfig: Record<
  Granularity,
  {
    label: string;
    menuLabel: string;
    todayLabel: string;
    unit: "day" | "week" | "month" | "year";
    inputType: string;
    inputFormat: string;
    displayFormat: string;
    parseInput: (v: string) => MomentLike;
    showWeekday: boolean;
  }
> = {
  day: {
    label: "日",
    menuLabel: "日ごと",
    todayLabel: "今日",
    unit: "day",
    inputType: "date",
    inputFormat: DEFAULT_DAILY_NOTE_FORMAT,
    displayFormat: "YYYY年MM月DD日",
    parseInput: (v) => window.moment(v, DEFAULT_DAILY_NOTE_FORMAT),
    showWeekday: true,
  },
  week: {
    label: "週",
    menuLabel: "週ごと",
    todayLabel: "今週",
    unit: "week",
    inputType: "week",
    inputFormat: DEFAULT_WEEKLY_NOTE_FORMAT,
    displayFormat: "GGGG年 [W]WW週",
    parseInput: (v) => window.moment(v, DEFAULT_WEEKLY_NOTE_FORMAT),
    showWeekday: false,
  },
  month: {
    label: "月",
    menuLabel: "月ごと",
    todayLabel: "今月",
    unit: "month",
    inputType: "month",
    inputFormat: DEFAULT_MONTHLY_NOTE_FORMAT,
    displayFormat: "YYYY年MM月",
    parseInput: (v) => window.moment(v, DEFAULT_MONTHLY_NOTE_FORMAT),
    showWeekday: false,
  },
  year: {
    label: "年",
    menuLabel: "年ごと",
    todayLabel: "今年",
    unit: "year",
    inputType: "number",
    inputFormat: DEFAULT_YEARLY_NOTE_FORMAT,
    displayFormat: "YYYY年",
    parseInput: (v) => window.moment(v, DEFAULT_YEARLY_NOTE_FORMAT),
    showWeekday: false,
  },
};
