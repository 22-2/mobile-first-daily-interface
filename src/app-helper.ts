import { App, Editor, MarkdownView, TFile } from "obsidian";
import { Commands } from "obsidian-typings";
import { pickTaskName } from "./utils/strings";

export interface Task {
  mark: " " | string;
  name: string;
  offset: number;
  path: string;
}

interface UnsafeAppInterface {
  appId: string;
  commands: Commands;
}

export class AppHelper {
  private unsafeApp: App & UnsafeAppInterface;

  constructor(app: App) {
    this.unsafeApp = app as any;
  }

  getAppId(): string {
    return this.unsafeApp.appId;
  }

  async loadFile(path: string): Promise<string> {
    return this.unsafeApp.vault.adapter.read(path);
  }

  async cachedReadFile(file: TFile): Promise<string> {
    return this.unsafeApp.vault.cachedRead(file);
  }

  async replaceRange(
    path: string,
    startOffset: number,
    endOffset: number,
    replacement: string
  ): Promise<void> {
    const origin = await this.loadFile(path);
    await this.unsafeApp.vault.adapter.write(
      path,
      origin.slice(0, startOffset) + replacement + origin.slice(endOffset)
    );
  }

  async setCheckMark(
    path: string,
    mark: "x" | " " | string,
    offset: number
  ): Promise<void> {
    const origin = await this.loadFile(path);
    const markOffset = offset + origin.slice(offset).indexOf("[") + 1;
    await this.unsafeApp.vault.adapter.write(
      path,
      `${origin.slice(0, markOffset)}${mark}${origin.slice(markOffset + 1)}`
    );
  }

  getActiveFile(): TFile | null {
    // noinspection TailRecursionJS
    return this.unsafeApp.workspace.getActiveFile();
  }

  getActiveMarkdownView(): MarkdownView | null {
    return this.unsafeApp.workspace.getActiveViewOfType(MarkdownView);
  }

  getActiveMarkdownEditor(): Editor | null {
    return this.getActiveMarkdownView()?.editor ?? null;
  }

  insertTextToEnd(file: TFile, text: string) {
    return this.unsafeApp.vault.adapter.append(file.path, text);
  }

  async insertTextAfter(file: TFile, text: string, after: string) {
    if (!after) {
      return this.insertTextToEnd(file, text);
    }

    const content = await this.loadFile(file.path);
    const index = content.indexOf(after);
    if (index === -1) {
      return this.insertTextToEnd(file, text);
    }

    const insertIndex = index + after.length;
    const newContent =
      content.slice(0, insertIndex) +
      "\n" +
      text +
      content.slice(insertIndex);
    await this.unsafeApp.vault.adapter.write(file.path, newContent);
  }

  async getTasks(file: TFile): Promise<Task[] | null> {
    const content = await this.loadFile(file.path);
    const lines = content.split("\n");

    return (
      this.unsafeApp.metadataCache
        .getFileCache(file)
        ?.listItems?.filter((x) => x.task != null)
        .map((x) => {
          const text = lines.at(x.position.start.line)!;
          const name = pickTaskName(text);
          return {
            mark: x.task!,
            name,
            offset: x.position.start.offset,
            path: file.path,
          };
        }) ?? null
    );
  }
}
