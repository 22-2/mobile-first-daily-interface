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
    todayLabel: string;
    unit: "day" | "week" | "month" | "year";
    inputType: string;
    inputFormat: string;
    parseInput: (v: string) => MomentLike;
    showWeekday: boolean;
  }
> = {
  day: {
    todayLabel: "今日",
    unit: "day",
    inputType: "date",
    inputFormat: "YYYY-MM-DD",
    parseInput: (v) => window.moment(v),
    showWeekday: true,
  },
  week: {
    todayLabel: "今週",
    unit: "week",
    inputType: "week",
    inputFormat: "GGGG-[W]WW",
    parseInput: (v) => window.moment(v, "GGGG-[W]WW"),
    showWeekday: false,
  },
  month: {
    todayLabel: "今月",
    unit: "month",
    inputType: "month",
    inputFormat: "YYYY-MM",
    parseInput: (v) => window.moment(v, "YYYY-MM"),
    showWeekday: false,
  },
  year: {
    todayLabel: "今年",
    unit: "year",
    inputType: "number",
    inputFormat: "YYYY",
    parseInput: (v) => window.moment(v, "YYYY"),
    showWeekday: false,
  },
};
