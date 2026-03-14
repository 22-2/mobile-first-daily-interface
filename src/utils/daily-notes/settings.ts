import { Granularity } from "src/ui/types";

export interface PeriodicNoteSettings {
  format: string;
  folder: string;
  template: string;
}

interface PeriodicNotesPlugin {
  settings: {
    [key: string]:
      | {
          enabled: boolean;
          format?: string;
          folder?: string;
          template?: string;
        }
      | undefined;
  };
}

interface DailyNotesPlugin {
  instance: {
    options: {
      format?: string;
      folder?: string;
      template?: string;
    };
  };
}

interface CalendarPlugin {
  options: {
    weeklyNoteFormat?: string;
    weeklyNoteFolder?: string;
    weeklyNoteTemplate?: string;
  };
}

const DEFAULT_DAILY_NOTE_FORMAT = "YYYY-MM-DD";
const DEFAULT_WEEKLY_NOTE_FORMAT = "gggg-[W]ww";
const DEFAULT_MONTHLY_NOTE_FORMAT = "YYYY-MM";
const DEFAULT_QUARTERLY_NOTE_FORMAT = "YYYY-[Q]Q";
const DEFAULT_YEARLY_NOTE_FORMAT = "YYYY";

function shouldUsePeriodicNotesSettings(periodicity: string): boolean {
  const periodicNotes = (window as any).app.plugins.getPlugin(
    "periodic-notes",
  ) as PeriodicNotesPlugin | undefined;
  return !!(periodicNotes && periodicNotes.settings?.[periodicity]?.enabled);
}

export function getDailyNoteSettings(): PeriodicNoteSettings {
  try {
    const { internalPlugins, plugins } = (window as any).app;
    if (shouldUsePeriodicNotesSettings("daily")) {
      const daily = (
        plugins.getPlugin("periodic-notes") as PeriodicNotesPlugin | undefined
      )?.settings?.daily;
      return {
        format: daily?.format || DEFAULT_DAILY_NOTE_FORMAT,
        folder: daily?.folder?.trim() || "",
        template: daily?.template?.trim() || "",
      };
    }
    const dailyOptions = (
      internalPlugins.getPluginById("daily-notes") as
        | DailyNotesPlugin
        | undefined
    )?.instance?.options;
    return {
      format: dailyOptions?.format || DEFAULT_DAILY_NOTE_FORMAT,
      folder: dailyOptions?.folder?.trim() || "",
      template: dailyOptions?.template?.trim() || "",
    };
  } catch {
    return { format: DEFAULT_DAILY_NOTE_FORMAT, folder: "", template: "" };
  }
}

export function getWeeklyNoteSettings(): PeriodicNoteSettings {
  try {
    const pluginManager = (window as any).app.plugins;
    const calendarSettings = (
      pluginManager.getPlugin("calendar") as CalendarPlugin | undefined
    )?.options;
    const periodicNotesSettings = (
      pluginManager.getPlugin("periodic-notes") as
        | PeriodicNotesPlugin
        | undefined
    )?.settings?.weekly;
    if (shouldUsePeriodicNotesSettings("weekly")) {
      return {
        format: periodicNotesSettings?.format || DEFAULT_WEEKLY_NOTE_FORMAT,
        folder: periodicNotesSettings?.folder?.trim() || "",
        template: periodicNotesSettings?.template?.trim() || "",
      };
    }
    return {
      format: calendarSettings?.weeklyNoteFormat || DEFAULT_WEEKLY_NOTE_FORMAT,
      folder: calendarSettings?.weeklyNoteFolder?.trim() || "",
      template: calendarSettings?.weeklyNoteTemplate?.trim() || "",
    };
  } catch {
    return { format: DEFAULT_WEEKLY_NOTE_FORMAT, folder: "", template: "" };
  }
}

export function getMonthlyNoteSettings(): PeriodicNoteSettings {
  try {
    const pluginManager = (window as any).app.plugins;
    const periodic = shouldUsePeriodicNotesSettings("monthly")
      ? (
          pluginManager.getPlugin("periodic-notes") as
            | PeriodicNotesPlugin
            | undefined
        )?.settings?.monthly
      : undefined;
    return {
      format: periodic?.format || DEFAULT_MONTHLY_NOTE_FORMAT,
      folder: periodic?.folder?.trim() || "",
      template: periodic?.template?.trim() || "",
    };
  } catch {
    return { format: DEFAULT_MONTHLY_NOTE_FORMAT, folder: "", template: "" };
  }
}

export function getYearlyNoteSettings(): PeriodicNoteSettings {
  try {
    const pluginManager = (window as any).app.plugins;
    const periodic = shouldUsePeriodicNotesSettings("yearly")
      ? (
          pluginManager.getPlugin("periodic-notes") as
            | PeriodicNotesPlugin
            | undefined
        )?.settings?.yearly
      : undefined;
    return {
      format: periodic?.format || DEFAULT_YEARLY_NOTE_FORMAT,
      folder: periodic?.folder?.trim() || "",
      template: periodic?.template?.trim() || "",
    };
  } catch {
    return { format: DEFAULT_YEARLY_NOTE_FORMAT, folder: "", template: "" };
  }
}

export function getPeriodicSettings(g: Granularity): PeriodicNoteSettings {
  switch (g) {
    case "week":
      return getWeeklyNoteSettings();
    case "month":
      return getMonthlyNoteSettings();
    case "year":
      return getYearlyNoteSettings();
    default:
      return getDailyNoteSettings();
  }
}
