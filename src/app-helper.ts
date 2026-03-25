import { App, Editor, MarkdownView, TFile } from "obsidian";
import { Commands } from "obsidian-typings";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { MomentLike } from "src/ui/types";
import { parseMarkdownList } from "src/utils/strings";
import { parseTaskTimestamp } from "src/utils/task-parser";

function trimLeadingLineBreaks(text: string): string {
  return text.replace(/^(?:\r\n|\r|\n)+/, "");
}

function joinWithSingleBoundaryNewline(content: string, text: string): string {
  const normalizedText = trimLeadingLineBreaks(text);

  if (normalizedText.length === 0) {
    return content;
  }

  if (content.length === 0 || content.endsWith("\n")) {
    return content + normalizedText;
  }

  return `${content}\n${normalizedText}`;
}

function skipImmediateLineBreak(content: string, index: number): number {
  if (content.slice(index, index + 2) === "\r\n") {
    return index + 2;
  }

  if (content[index] === "\n" || content[index] === "\r") {
    return index + 1;
  }

  return index;
}

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

export class AppHelper extends ObsidianAppShell {
  protected unsafeApp: App & UnsafeAppInterface;

  constructor(app: App) {
    super(app);
    this.unsafeApp = app as any;
  }

  getApp(): App {
    return this.getRawApp();
  }

  async loadFile(path: string): Promise<string> {
    return this.readFile(path);
  }

  async replaceRange(
    path: string,
    startOffset: number,
    endOffset: number,
    replacement: string,
  ): Promise<void> {
    const origin = await this.loadFile(path);
    await this.writeFile(
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
    await this.writeFile(
      path,
      `${origin.slice(0, markOffset)}${mark}${origin.slice(markOffset + 1)}`,
    );
  }

  insertTextToEnd(file: TFile, text: string) {
    return this.appendFile(file.path, text);
  }

  async insertTextAfter(file: TFile, text: string, after: string) {
    const content = await this.loadFile(file.path);

    if (!after) {
      await this.writeFile(
        file.path,
        joinWithSingleBoundaryNewline(content, text),
      );
      return;
    }

    const index = content.indexOf(after);
    if (index === -1) {
      await this.writeFile(
        file.path,
        joinWithSingleBoundaryNewline(content, text),
      );
      return;
    }

    const insertIndex = skipImmediateLineBreak(content, index + after.length);
    const newContent =
      joinWithSingleBoundaryNewline(content.slice(0, insertIndex), text) +
      content.slice(insertIndex);
    await this.writeFile(file.path, newContent);
  }

  async getTasks(file: TFile): Promise<Task[] | null> {
    const content = await this.loadFile(file.path);
    const lines = content.split("\n");

    return (
      this.getMetadataCache()
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
