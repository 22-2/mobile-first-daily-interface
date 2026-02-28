import { TFile } from "obsidian";
import {
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
  getDailyNoteSettings,
  createWeeklyNote,
  getAllWeeklyNotes,
  getWeeklyNote,
  getWeeklyNoteSettings,
  createMonthlyNote,
  getAllMonthlyNotes,
  getMonthlyNote,
  getMonthlyNoteSettings,
  createYearlyNote,
  getAllYearlyNotes,
  getYearlyNote,
  getYearlyNoteSettings,
  IPeriodicNoteSettings,
  DEFAULT_DAILY_NOTE_FORMAT,
  DEFAULT_WEEKLY_NOTE_FORMAT,
  DEFAULT_MONTHLY_NOTE_FORMAT,
  DEFAULT_YEARLY_NOTE_FORMAT,
} from "obsidian-daily-notes-interface";
import { Granularity, MomentLike } from "./types";

export const getAllNotes = (g: Granularity): Record<string, TFile> => {
  switch (g) {
    case "week":  return getAllWeeklyNotes();
    case "month": return getAllMonthlyNotes();
    case "year":  return getAllYearlyNotes();
    default:      return getAllDailyNotes();
  }
};

export const getNote = (
  date: MomentLike,
  notes: Record<string, TFile>,
  g: Granularity
): TFile | null => {
  switch (g) {
    case "week":  return getWeeklyNote(date, notes) as TFile | null;
    case "month": return getMonthlyNote(date, notes) as TFile | null;
    case "year":  return getYearlyNote(date, notes) as TFile | null;
    default:      return getDailyNote(date, notes) as TFile | null;
  }
};

export const createNote = (date: MomentLike, g: Granularity): Promise<TFile> => {
  switch (g) {
    case "week":  return createWeeklyNote(date);
    case "month": return createMonthlyNote(date);
    case "year":  return createYearlyNote(date);
    default:      return createDailyNote(date);
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
