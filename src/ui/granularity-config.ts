import { normalizePath, TFile, Vault } from "obsidian";
import { Granularity, MomentLike } from "./types";

// ─────────────────────────────────────────────────────────────────
// Constants (mirrored from obsidian-daily-notes-interface)
// ─────────────────────────────────────────────────────────────────
const DEFAULT_DAILY_NOTE_FORMAT = "YYYY-MM-DD";
const DEFAULT_WEEKLY_NOTE_FORMAT = "gggg-[W]ww";
const DEFAULT_MONTHLY_NOTE_FORMAT = "YYYY-MM";
const DEFAULT_YEARLY_NOTE_FORMAT = "YYYY";

// ─────────────────────────────────────────────────────────────────
// Periodic note settings (自前実装)
// obsidian-daily-notes-interface の getXxxNoteSettings をTSに移植
// ─────────────────────────────────────────────────────────────────
export interface PeriodicNoteSettings {
  format: string;
  folder: string;
  template: string;
}

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

/** 粒度に応じた設定を返す */
export function getPeriodicSettings(g: Granularity): PeriodicNoteSettings {
  switch (g) {
    case "week":  return getWeeklyNoteSettings();
    case "month": return getMonthlyNoteSettings();
    case "year":  return getYearlyNoteSettings();
    default:      return getDailyNoteSettings();
  }
}

// ─────────────────────────────────────────────────────────────────
// dateUID (mirrored from obsidian-daily-notes-interface)
// ─────────────────────────────────────────────────────────────────
export function getDateUID(date: MomentLike, granularity: Granularity = "day"): string {
  const ts = date.clone().startOf(granularity).format();
  return `${granularity}-${ts}`;
}

// ─────────────────────────────────────────────────────────────────
// Topic-aware note resolution
// ─────────────────────────────────────────────────────────────────

/**
 * トピックIDとgranularityから、ノートのフルパスを生成する。
 * topicId="" → "folder/2026-03-04.md"
 * topicId="novel" → "folder/novel-2026-03-04.md"
 */
export function resolveTopicNotePath(
  date: MomentLike,
  g: Granularity,
  topicId: string
): string {
  const { format, folder } = getPeriodicSettings(g);
  const dateStr = date.format(format);
  const prefix = topicId ? `${topicId}-` : "";
  const filename = `${prefix}${dateStr}.md`;
  return folder
    ? normalizePath(`${folder}/${filename}`)
    : normalizePath(filename);
}

/**
 * Vault内からトピック付きノートを全件取得し、dateUID -> TFile のマップを返す。
 * topicId="" の場合はプレフィックスなし（デフォルトのデイリーノートと同じ）。
 */
export function getAllTopicNotes(
  g: Granularity,
  topicId: string
): Record<string, TFile> {
  const { format, folder } = getPeriodicSettings(g);
  const { vault } = (window as any).app;

  const folderPath = folder ? normalizePath(folder) : "/";
  const folderFile = vault.getAbstractFileByPath(folderPath) ?? vault.getRoot();

  const result: Record<string, TFile> = {};
  const prefix = topicId ? `${topicId}-` : "";

  Vault.recurseChildren(folderFile, (node) => {
    if (!(node instanceof TFile)) return;
    if (node.extension !== "md") return;

    const basename = node.basename; // 拡張子なし

    // プレフィックスが合わなければスキップ
    if (prefix && !basename.startsWith(prefix)) return;
    // デフォルト(prefix="")の場合は、他トピックのファイルを弾く
    // → フォーマットに直接マッチするかをチェックする（後述）

    const datePart = prefix ? basename.slice(prefix.length) : basename;
    const date = window.moment(datePart, format, /* strict= */ true);
    if (!date.isValid()) return;

    // デフォルトトピックのとき、"novel-2026-03-04" のような
    // 他トピックのファイルを誤って拾わないようにする
    if (!prefix) {
      // form: datePart should exactly match the format
      const formatted = date.format(format);
      if (datePart !== formatted) return;
    }

    const uid = getDateUID(date, g);
    result[uid] = node;
  });

  return result;
}

/**
 * 特定の日付のトピック付きノートを返す。存在しなければ null。
 */
export function getTopicNote(
  date: MomentLike,
  g: Granularity,
  topicId: string
): TFile | null {
  const notes = getAllTopicNotes(g, topicId);
  const uid = getDateUID(date, g);
  return notes[uid] ?? null;
}

/**
 * トピック付きノートを新規作成する（テンプレートなしのシンプル版）。
 * フォルダが存在しない場合は自動作成する。
 */
export async function createTopicNote(
  date: MomentLike,
  g: Granularity,
  topicId: string
): Promise<TFile> {
  const path = resolveTopicNotePath(date, g, topicId);
  const { vault } = (window as any).app;

  // フォルダ作成
  const dir = path.substring(0, path.lastIndexOf("/"));
  if (dir && !vault.getAbstractFileByPath(dir)) {
    await vault.createFolder(dir);
  }

  // insertAfter の設定はここでは考慮しない（ReactView 側で行う）
  const file = await vault.create(path, "");
  return file;
}

// ─────────────────────────────────────────────────────────────────
// UI display config (granularityConfig は変更なし)
// ─────────────────────────────────────────────────────────────────
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
