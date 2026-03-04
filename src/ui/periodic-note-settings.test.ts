import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Obsidian module
vi.mock("obsidian", () => ({
  normalizePath: (p: string) => p,
}));

import {
    getDailyNoteSettings,
    getMonthlyNoteSettings,
    getPeriodicSettings,
    getWeeklyNoteSettings,
    getYearlyNoteSettings
} from "./periodic-note-settings";

// ─────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────
function makeApp(overrides: {
  periodicNotesPlugin?: Record<string, any> | null;
  calendarPlugin?: Record<string, any> | null;
  dailyNotesInstance?: Record<string, any> | null;
}) {
  (window as any).app = {
    plugins: {
      getPlugin: vi.fn((id: string) => {
        if (id === "periodic-notes") return overrides.periodicNotesPlugin ?? null;
        if (id === "calendar") return overrides.calendarPlugin ?? null;
        return null;
      }),
    },
    internalPlugins: {
      getPluginById: vi.fn((id: string) => {
        if (id === "daily-notes")
          return overrides.dailyNotesInstance != null
            ? { instance: { options: overrides.dailyNotesInstance } }
            : null;
        return null;
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────
// getDailyNoteSettings
// ─────────────────────────────────────────────────────────────────
describe("getDailyNoteSettings", () => {
  it("periodic-notes プラグインが有効なら、そちらの設定を返す", () => {
    makeApp({
      periodicNotesPlugin: {
        settings: {
          daily: { format: "DD-MM-YYYY", folder: "  Journal  ", template: "tmpl", enabled: true },
        },
      },
    });

    const s = getDailyNoteSettings();
    expect(s.format).toBe("DD-MM-YYYY");
    expect(s.folder).toBe("Journal"); // trim 確認
    expect(s.template).toBe("tmpl");
  });

  it("periodic-notes が無効なら core daily-notes プラグインの設定を返す", () => {
    makeApp({
      periodicNotesPlugin: {
        settings: { daily: { enabled: false } }, // enabled = false
      },
      dailyNotesInstance: { format: "YYYY/MM/DD", folder: "Daily", template: "" },
    });

    const s = getDailyNoteSettings();
    expect(s.format).toBe("YYYY/MM/DD");
    expect(s.folder).toBe("Daily");
  });

  it("プラグインが一切存在しない場合はデフォルト値を返す", () => {
    makeApp({ periodicNotesPlugin: null, dailyNotesInstance: null });

    const s = getDailyNoteSettings();
    expect(s.format).toBe("YYYY-MM-DD");
    expect(s.folder).toBe("");
    expect(s.template).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────
// getWeeklyNoteSettings
// ─────────────────────────────────────────────────────────────────
describe("getWeeklyNoteSettings", () => {
  it("periodic-notes が有効なら週次設定を返す", () => {
    makeApp({
      periodicNotesPlugin: {
        settings: {
          weekly: {
            format: "GGGG-[W]WW",
            folder: "Weekly",
            template: "",
            enabled: true,
          },
        },
      },
    });

    const s = getWeeklyNoteSettings();
    expect(s.format).toBe("GGGG-[W]WW");
    expect(s.folder).toBe("Weekly");
  });

  it("periodic-notes が無効なら calendar プラグインの設定にフォールバックする", () => {
    makeApp({
      periodicNotesPlugin: {
        settings: { weekly: { enabled: false } },
      },
      calendarPlugin: {
        options: {
          weeklyNoteFormat: "YYYY-[W]ww",
          weeklyNoteFolder: "  Cal  ",
          weeklyNoteTemplate: "",
        },
      },
    });

    const s = getWeeklyNoteSettings();
    expect(s.format).toBe("YYYY-[W]ww");
    expect(s.folder).toBe("Cal"); // trim
  });

  it("何も設定がない場合はデフォルト値を返す", () => {
    makeApp({ periodicNotesPlugin: null, calendarPlugin: null });

    const s = getWeeklyNoteSettings();
    expect(s.format).toBe("gggg-[W]ww");
  });
});

// ─────────────────────────────────────────────────────────────────
// getMonthlyNoteSettings
// ─────────────────────────────────────────────────────────────────
describe("getMonthlyNoteSettings", () => {
  it("periodic-notes が有効なら月次設定を返す", () => {
    makeApp({
      periodicNotesPlugin: {
        settings: {
          monthly: { format: "YYYY-MM", folder: "Monthly", template: "", enabled: true },
        },
      },
    });

    const s = getMonthlyNoteSettings();
    expect(s.format).toBe("YYYY-MM");
  });

  it("何も設定がない場合はデフォルト値を返す", () => {
    makeApp({ periodicNotesPlugin: null });

    const s = getMonthlyNoteSettings();
    expect(s.format).toBe("YYYY-MM");
    expect(s.folder).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────
// getYearlyNoteSettings
// ─────────────────────────────────────────────────────────────────
describe("getYearlyNoteSettings", () => {
  it("periodic-notes が有効なら年次設定を返す", () => {
    makeApp({
      periodicNotesPlugin: {
        settings: {
          yearly: { format: "YYYY", folder: "Yearly", template: "", enabled: true },
        },
      },
    });

    const s = getYearlyNoteSettings();
    expect(s.format).toBe("YYYY");
    expect(s.folder).toBe("Yearly");
  });

  it("何も設定がない場合はデフォルト値を返す", () => {
    makeApp({ periodicNotesPlugin: null });

    const s = getYearlyNoteSettings();
    expect(s.format).toBe("YYYY");
  });
});

// ─────────────────────────────────────────────────────────────────
// getPeriodicSettings — ディスパッチのみを確認
// ─────────────────────────────────────────────────────────────────
describe("getPeriodicSettings", () => {
  beforeEach(() => {
    makeApp({ periodicNotesPlugin: null, calendarPlugin: null });
  });

  it.each([
    ["day",   "YYYY-MM-DD"],
    ["week",  "gggg-[W]ww"],
    ["month", "YYYY-MM"],
    ["year",  "YYYY"],
  ] as const)("granularity=%s → format=%s のデフォルト値", (g, expected) => {
    expect(getPeriodicSettings(g).format).toBe(expected);
  });
});
