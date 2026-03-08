import { Granularity } from "../../ui/types";

export interface PeriodicNoteSettings {
  format: string;
  folder: string;
  template: string;
}

const DEFAULT_DAILY_NOTE_FORMAT = "YYYY-MM-DD";
const DEFAULT_WEEKLY_NOTE_FORMAT = "gggg-[W]ww";
const DEFAULT_MONTHLY_NOTE_FORMAT = "YYYY-MM";
const DEFAULT_QUARTERLY_NOTE_FORMAT = "YYYY-[Q]Q";
const DEFAULT_YEARLY_NOTE_FORMAT = "YYYY";

function shouldUsePeriodicNotesSettings(periodicity: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodicNotes = (window as any).app.plugins.getPlugin("periodic-notes");
  return periodicNotes && periodicNotes.settings?.[periodicity]?.enabled;
}

export function getDailyNoteSettings(): PeriodicNoteSettings {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { internalPlugins, plugins } = (window as any).app;
    if (shouldUsePeriodicNotesSettings("daily")) {
      const { format, folder, template } =
        plugins.getPlugin("periodic-notes")?.settings?.daily || {};
      return {
        format: format || DEFAULT_DAILY_NOTE_FORMAT,
        folder: folder?.trim() || "",
        template: template?.trim() || "",
      };
    }
    const { folder, format, template } =
      internalPlugins.getPluginById("daily-notes")?.instance?.options || {};
    return {
      format: format || DEFAULT_DAILY_NOTE_FORMAT,
      folder: folder?.trim() || "",
      template: template?.trim() || "",
    };
  } catch {
    return { format: DEFAULT_DAILY_NOTE_FORMAT, folder: "", template: "" };
  }
}

export function getWeeklyNoteSettings(): PeriodicNoteSettings {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pluginManager = (window as any).app.plugins;
    const calendarSettings = pluginManager.getPlugin("calendar")?.options;
    const periodicNotesSettings =
      pluginManager.getPlugin("periodic-notes")?.settings?.weekly;
    if (shouldUsePeriodicNotesSettings("weekly")) {
      return {
        format: periodicNotesSettings.format || DEFAULT_WEEKLY_NOTE_FORMAT,
        folder: periodicNotesSettings.folder?.trim() || "",
        template: periodicNotesSettings.template?.trim() || "",
      };
    }
    const settings = calendarSettings || {};
    return {
      format: settings.weeklyNoteFormat || DEFAULT_WEEKLY_NOTE_FORMAT,
      folder: settings.weeklyNoteFolder?.trim() || "",
      template: settings.weeklyNoteTemplate?.trim() || "",
    };
  } catch {
    return { format: DEFAULT_WEEKLY_NOTE_FORMAT, folder: "", template: "" };
  }
}

export function getMonthlyNoteSettings(): PeriodicNoteSettings {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pluginManager = (window as any).app.plugins;
    const settings =
      (shouldUsePeriodicNotesSettings("monthly") &&
        pluginManager.getPlugin("periodic-notes")?.settings?.monthly) ||
      {};
    return {
      format: (settings as any).format || DEFAULT_MONTHLY_NOTE_FORMAT,
      folder: (settings as any).folder?.trim() || "",
      template: (settings as any).template?.trim() || "",
    };
  } catch {
    return { format: DEFAULT_MONTHLY_NOTE_FORMAT, folder: "", template: "" };
  }
}

export function getYearlyNoteSettings(): PeriodicNoteSettings {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pluginManager = (window as any).app.plugins;
    const settings =
      (shouldUsePeriodicNotesSettings("yearly") &&
        pluginManager.getPlugin("periodic-notes")?.settings?.yearly) ||
      {};
    return {
      format: (settings as any).format || DEFAULT_YEARLY_NOTE_FORMAT,
      folder: (settings as any).folder?.trim() || "",
      template: (settings as any).template?.trim() || "",
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
