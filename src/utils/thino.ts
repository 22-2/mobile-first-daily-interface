import { trimRedundantEmptyLines } from "./strings";

export interface ThinoEntry {
  time: string;
  message: string;
  /** Offset to the start of `- HH:MM:SS` (0-based). */
  offset: number;
  /** Offset to the start of the line containing the `- HH:MM:SS` bullet (0-based). */
  startOffset: number;
  /** Offset to the start of the body (first char after the bullet line's newline) (0-based). */
  bodyStartOffset: number;
  /** Offset to the start of the next entry/heading (exclusive end) (0-based). */
  endOffset: number;
}

function getHeadingLevel(line: string): number | null {
  const m = line.match(/^(#{1,6})\s+/);
  return m ? m[1].length : null;
}

function isThinoHeading(line: string): boolean {
  // Accept `## Thino` (case-insensitive) with extra spaces.
  return /^#{1,6}\s+thino\s*$/i.test(line.trim());
}

function matchTimeBullet(line: string): { time: string; dashIndex: number } | null {
  // Allows leading spaces.
  const m = line.match(/^([ \t]*)-\s*(\d{2}:\d{2}:\d{2})\s*$/);
  if (!m) {
    return null;
  }

  const indent = m[1] ?? "";
  const time = m[2];
  return { time, dashIndex: indent.length };
}

function deindentBodyLine(line: string): string {
  // Keep empty lines as empty.
  if (line.trim().length === 0) {
    return "";
  }

  // Thino list body is typically indented by 4 spaces (or one tab).
  if (line.startsWith("\t")) {
    return line.slice(1);
  }
  if (line.startsWith("    ")) {
    return line.slice(4);
  }

  return line;
}

export function parseThinoEntries(content: string): ThinoEntry[] {
  const lines = content.split("\n");

  let offset = 0;
  let thinoHeadingLevel: number | null = null;
  let inThinoSection = false;

  const entries: ThinoEntry[] = [];
  let current:
    | {
        time: string;
        offset: number;
        startOffset: number;
        bodyStartOffset: number;
        bodyLines: string[];
      }
    | null = null;

  const flush = (endOffset: number) => {
    if (!current) {
      return;
    }

    const message = trimRedundantEmptyLines(current.bodyLines.join("\n")).replace(
      /^\n+/g,
      ""
    );

    // Thino entries without body are allowed (empty message).
    entries.push({
      time: current.time,
      message,
      offset: current.offset,
      startOffset: current.startOffset,
      bodyStartOffset: current.bodyStartOffset,
      endOffset,
    });
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");

    if (!inThinoSection) {
      if (isThinoHeading(line)) {
        inThinoSection = true;
        thinoHeadingLevel = getHeadingLevel(line) ?? 2;
      }

      offset += rawLine.length + 1;
      continue;
    }

    // End section if we hit a heading of same-or-higher level.
    const headingLevel = getHeadingLevel(line);
    if (
      headingLevel != null &&
      thinoHeadingLevel != null &&
      headingLevel <= thinoHeadingLevel
    ) {
      flush(offset);
      break;
    }

    const timeBullet = matchTimeBullet(line);
    if (timeBullet) {
      flush(offset);
      current = {
        time: timeBullet.time,
        offset: offset + timeBullet.dashIndex,
        startOffset: offset,
        bodyStartOffset: offset + rawLine.length + 1,
        bodyLines: [],
      };
      offset += rawLine.length + 1;
      continue;
    }

    if (current) {
      current.bodyLines.push(deindentBodyLine(line));
    }

    offset += rawLine.length + 1;
  }

  flush(offset);
  return entries;
}
