import { normalizePath, TFile } from "obsidian";
import { ensureExtension } from "src/core/path";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";

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

export function isMFDIFixedNotePath(path: string): boolean {
  return normalizePath(path).toLowerCase().endsWith(".mfdi.md");
}

export function resolveFixedNote(
  shell: ObsidianAppShell,
  rawPath: string | null,
): TFile | null {
  const path = normalizeFixedNotePath(rawPath ?? "");
  if (!path) return null;
  const file = shell.getAbstractFileByPath(path);
  return file instanceof TFile ? file : null;
}

async function ensureFolderPath(
  shell: ObsidianAppShell,
  path: string,
): Promise<void> {
  const segments = path.split("/").filter(Boolean);
  let currentPath = "";

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    if (shell.getAbstractFileByPath(currentPath)) continue;
    await shell.createFolder(currentPath);
  }
}

export async function ensureFixedNote(
  shell: ObsidianAppShell,
  rawPath: string,
): Promise<TFile> {
  const path = normalizeFixedNotePath(rawPath);
  if (!path) {
    throw new Error("fixed note path is empty");
  }

  const existing = resolveFixedNote(shell, path);
  if (existing) return existing;

  const lastSlash = path.lastIndexOf("/");
  if (lastSlash > 0) {
    await ensureFolderPath(shell, path.slice(0, lastSlash));
  }

  return shell.createFile(path, "");
}

export function buildFixedNotePathFromName(
  folder: string,
  name: string,
  shell: ObsidianAppShell,
): string {
  const normalizedFolder = normalizeFixedNoteFolder(folder);
  const prefix = normalizedFolder ? `${normalizedFolder}/` : "";
  const safeName = name.trim() || "Untitled";
  const base = ensureExtension(`${prefix}${safeName}`, ".mfdi.md");
  if (!shell.getAbstractFileByPath(base)) return base;
  for (let i = 1; ; i++) {
    const candidate = `${prefix}${safeName} ${i}.mfdi.md`;
    if (!shell.getAbstractFileByPath(candidate)) return candidate;
  }
}

export function buildUntitledFixedNotePath(
  folder: string,
  shell: ObsidianAppShell,
): string {
  return buildFixedNotePathFromName(folder, "Untitled", shell);
}

export async function createNewFixedNote(
  shell: ObsidianAppShell,
  folder: string,
): Promise<TFile> {
  const path = buildUntitledFixedNotePath(folder, shell);
  return ensureFixedNote(shell, path);
}
