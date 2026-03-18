import { App, TFile } from "obsidian";

export function createMarkdownFile(app: App, path: string): Promise<TFile> {
  const folderPath = app.vault.config.newFileFolderPath;

  if (typeof folderPath !== "string") {
    throw new Error("invalid new file folder path");
  }

  const folder = app.vault.getFolderByPath(folderPath);

  if (!folder) {
    throw new Error("invalid new file folder path");
  }

  return app.fileManager.createNewMarkdownFile(folder, path, "");
}
