import { normalizePath, TFile, Vault } from "obsidian";
import { getPeriodicSettings } from "./periodic-note-settings";
import { Granularity, MomentLike } from "./types";

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
