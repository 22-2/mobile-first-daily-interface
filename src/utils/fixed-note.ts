import { App, normalizePath, TFile } from "obsidian";
import { Granularity, MomentLike } from "src/ui/types";
import { MFDINoteMode } from "src/ui/view/state";
import { getTopicNote } from "src/utils/daily-notes";

export function normalizeFixedNoteFolder(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  return normalizePath(trimmed).replace(/\/$/, "");
}

export function normalizeFixedNotePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  const normalized = normalizePath(trimmed);
  return normalized.toLowerCase().endsWith(".md")
    ? normalized
    : `${normalized}.md`;
}

export function resolveFixedNote(app: App, rawPath: string | null): TFile | null {
  const path = normalizeFixedNotePath(rawPath ?? "");
  if (!path) return null;
  const file = app.vault.getAbstractFileByPath(path);
  return file instanceof TFile ? file : null;
}

async function ensureFolderPath(app: App, path: string): Promise<void> {
  const segments = path.split("/").filter(Boolean);
  let currentPath = "";

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    if (app.vault.getAbstractFileByPath(currentPath)) continue;
    await app.vault.createFolder(currentPath);
  }
}

export async function ensureFixedNote(app: App, rawPath: string): Promise<TFile> {
  const path = normalizeFixedNotePath(rawPath);
  if (!path) {
    throw new Error("fixed note path is empty");
  }

  const existing = resolveFixedNote(app, path);
  if (existing) return existing;

  const lastSlash = path.lastIndexOf("/");
  if (lastSlash > 0) {
    await ensureFolderPath(app, path.slice(0, lastSlash));
  }

  return app.vault.create(path, "");
}

export function buildNewFixedNotePath(folder: string, now = window.moment()): string {
  const normalizedFolder = normalizeFixedNoteFolder(folder);
  const filename = `MFDI-${now.format("YYYY-MM-DD-HHmmss")}.md`;
  return normalizedFolder ? `${normalizedFolder}/${filename}` : filename;
}

export async function createNewFixedNote(app: App, folder: string): Promise<TFile> {
  const path = buildNewFixedNotePath(folder);
  return ensureFixedNote(app, path);
}

export function resolveCurrentTargetNote(params: {
  app: App;
  date: MomentLike;
  granularity: Granularity;
  activeTopic: string;
  noteMode: MFDINoteMode;
  fixedNotePath: string | null;
}): TFile | null {
  const { app, date, granularity, activeTopic, noteMode, fixedNotePath } =
    params;

  if (noteMode === "fixed") {
    return resolveFixedNote(app, fixedNotePath);
  }

  return getTopicNote(app, date, granularity, activeTopic);
}
