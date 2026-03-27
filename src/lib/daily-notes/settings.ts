import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import type { Granularity } from "src/ui/types";

interface PeriodicNoteSettings {
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

type Periodicity = "daily" | "weekly" | "monthly" | "yearly";
type PeriodicNotesEntry = {
  enabled: boolean;
  format?: string;
  folder?: string;
  template?: string;
};

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

function shouldUsePeriodicNotesSettings(
  shell: ObsidianAppShell,
  periodicity: string,
): boolean {
  const periodicNotes =
    shell.getCommunityPlugin<PeriodicNotesPlugin>("periodic-notes");
  return !!(periodicNotes && periodicNotes.settings?.[periodicity]?.enabled);
}

function getPeriodicNotesSettings(
  shell: ObsidianAppShell,
  periodicity: Periodicity,
) {
  const periodicNotes =
    shell.getCommunityPlugin<PeriodicNotesPlugin>("periodic-notes");
  return periodicNotes?.settings?.[periodicity] as
    | PeriodicNotesEntry
    | undefined;
}

export function getDailyNoteSettings(
  shell: ObsidianAppShell,
): PeriodicNoteSettings {
  try {
    if (shouldUsePeriodicNotesSettings(shell, "daily")) {
      const daily =
        shell.getCommunityPlugin<PeriodicNotesPlugin>("periodic-notes")
          ?.settings?.daily;
      return {
        format: daily?.format || DEFAULT_DAILY_NOTE_FORMAT,
        folder: daily?.folder?.trim() || "",
        template: daily?.template?.trim() || "",
      };
    }
    const dailyOptions =
      shell.getInternalPluginById<DailyNotesPlugin>("daily-notes")?.instance
        ?.options;
    return {
      format: dailyOptions?.format || DEFAULT_DAILY_NOTE_FORMAT,
      folder: dailyOptions?.folder?.trim() || "",
      template: dailyOptions?.template?.trim() || "",
    };
  } catch {
    return { format: DEFAULT_DAILY_NOTE_FORMAT, folder: "", template: "" };
  }
}

function getWeeklyNoteSettings(shell: ObsidianAppShell): PeriodicNoteSettings {
  try {
    const calendarSettings =
      shell.getCommunityPlugin<CalendarPlugin>("calendar")?.options;
    const periodicNotesSettings =
      shell.getCommunityPlugin<PeriodicNotesPlugin>("periodic-notes")?.settings
        ?.weekly;
    if (shouldUsePeriodicNotesSettings(shell, "weekly")) {
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

export function getMonthlyNoteSettings(
  shell: ObsidianAppShell,
): PeriodicNoteSettings {
  try {
    const periodic = getPeriodicNotesSettings(shell, "monthly");
    return {
      format: periodic?.format || DEFAULT_MONTHLY_NOTE_FORMAT,
      folder: periodic?.folder?.trim() || "",
      template: periodic?.template?.trim() || "",
    };
  } catch {
    return { format: DEFAULT_MONTHLY_NOTE_FORMAT, folder: "", template: "" };
  }
}

export function getYearlyNoteSettings(
  shell: ObsidianAppShell,
): PeriodicNoteSettings {
  try {
    const periodic = getPeriodicNotesSettings(shell, "yearly");
    return {
      format: periodic?.format || DEFAULT_YEARLY_NOTE_FORMAT,
      folder: periodic?.folder?.trim() || "",
      template: periodic?.template?.trim() || "",
    };
  } catch {
    return { format: DEFAULT_YEARLY_NOTE_FORMAT, folder: "", template: "" };
  }
}

export function getPeriodicSettings(
  g: Granularity,
  shell: ObsidianAppShell,
): PeriodicNoteSettings {
  switch (g) {
    case "week":
      return getWeeklyNoteSettings(shell);
    case "month":
      return getMonthlyNoteSettings(shell);
    case "year":
      return getYearlyNoteSettings(shell);
    default:
      return getDailyNoteSettings(shell);
  }
}
