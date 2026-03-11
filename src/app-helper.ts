import { App, Editor, MarkdownView, TFile } from "obsidian";
import { Commands } from "obsidian-typings";
import { MomentLike } from "src/ui/types";
import { parseMarkdownList } from "src/utils/strings";
import { parseTaskTimestamp } from "src/utils/task-parser";

export interface Task {
  mark: " " | string;
  name: string;
  offset: number;
  path: string;
  timestamp: MomentLike;
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
    replacement: string,
  ): Promise<void> {
    const origin = await this.loadFile(path);
    await this.unsafeApp.vault.adapter.write(
      path,
      origin.slice(0, startOffset) + replacement + origin.slice(endOffset),
    );
  }

  async setCheckMark(
    path: string,
    mark: "x" | " " | string,
    offset: number,
  ): Promise<void> {
    const origin = await this.loadFile(path);
    const markOffset = offset + origin.slice(offset).indexOf("[") + 1;
    await this.unsafeApp.vault.adapter.write(
      path,
      `${origin.slice(0, markOffset)}${mark}${origin.slice(markOffset + 1)}`,
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
      content.slice(0, insertIndex) + "\n" + text + content.slice(insertIndex);
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
          const startLine = x.position.start.line;
          const endLine = x.position.end.line;

          // Basic task text from the metadata cache (usually one line)
          const firstLine = lines.at(startLine)!;

          // Find the actual end of the task (including multi-line content)
          // We look ahead until we find another list item at the same or higher level,
          // or a heading, or EOF.
          let lastLine = endLine;
          for (let i = endLine + 1; i < lines.length; i++) {
            const line = lines[i];
            // If the line is not indented, it's likely the start of a new block
            if (
              line.trim().length > 0 &&
              !line.startsWith(" ") &&
              !line.startsWith("\t")
            ) {
              break;
            }
            lastLine = i;
          }

          const taskContent = lines.slice(startLine, lastLine + 1).join("\n");
          const { prefix, content: rawName } = parseMarkdownList(taskContent);

          const { displayName, timestamp } = parseTaskTimestamp(
            rawName,
            file.basename,
          );

          return {
            mark: x.task!,
            name: displayName,
            offset: x.position.start.offset,
            path: file.path,
            timestamp,
          };
        }) ?? null
    );
  }
}
