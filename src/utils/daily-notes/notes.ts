import { App, normalizePath, TFile, TFolder, Vault } from "obsidian";
import { Granularity, MomentLike } from "src/ui/types";
import { getPeriodicSettings } from "src/utils/daily-notes/settings";
import { getDateFromFile, getDateUID } from "src/utils/daily-notes/utils";

/**
 * トピックIDとgranularityから、ノートのフルパスを生成する。
 * topicId="" → "folder/2026-03-04.md"
 * topicId="novel" → "folder/novel-2026-03-04.md"
 */
export function resolveTopicNotePath(
  date: MomentLike,
  g: Granularity,
  topicId: string,
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
  app: App,
  g: Granularity,
  topicId: string = "",
): Record<string, TFile> {
  const { folder } = getPeriodicSettings(g);
  const { vault } = app;

  const folderPath = folder ? normalizePath(folder) : "/";
  const folderFile = vault.getAbstractFileByPath(folderPath);
  const folderToSearch =
    folderFile instanceof TFolder ? folderFile : vault.getRoot();

  const result: Record<string, TFile> = {};

  Vault.recurseChildren(folderToSearch, (node) => {
    if (!(node instanceof TFile)) return;
    if (node.extension !== "md") return;

    const date = getDateFromFile(node, g, topicId);
    if (!date) return;

    const uid = getDateUID(date, g);
    result[uid] = node;
  });

  return result;
}

/**
 * 特定の日付のトピック付きノートを返す。存在しなければ null。
 */
export function getTopicNote(
  app: App,
  date: MomentLike,
  g: Granularity,
  topicId: string,
): TFile | null {
  const notes = getAllTopicNotes(app, g, topicId);
  const uid = getDateUID(date, g);
  return notes[uid] ?? null;
}

/**
 * トピック付きノートを新規作成する（テンプレートなしのシンプル版）。
 * フォルダが存在しない場合は自動作成する。
 */
export async function createTopicNote(
  app: App,
  date: MomentLike,
  g: Granularity,
  topicId: string,
): Promise<TFile> {
  const path = resolveTopicNotePath(date, g, topicId);
  const { vault } = app;

  // フォルダ作成
  const dir = path.substring(0, path.lastIndexOf("/"));
  if (dir && !vault.getAbstractFileByPath(dir)) {
    await vault.createFolder(dir);
  }

  const file = await vault.create(path, "");
  return file;
}
