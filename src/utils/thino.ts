
export interface ThinoEntry {
  time: string;
  message: string;
  metadata: Record<string, string>;
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

function matchTimeBullet(
  line: string,
): {
  time: string;
  dashIndex: number;
  message?: string;
  messageIndex?: number;
} | null {
  // Allows leading spaces. Accept optional trailing text after the time.
  // Support both "HH:mm:ss" and "YYYY-MM-DD HH:mm:ss" formats.
  const m = line.match(
    /^([ \t]*)-\s*((?:\d{4}-\d{2}-\d{2}\s+)?\d{2}:\d{2}:\d{2})(?:\s+(.*))?$/,
  );
  if (!m) {
    return null;
  }

  const indent = m[1] ?? "";
  const time = m[2];
  const message = m[3];
  const messageIndex = message ? line.indexOf(message) : undefined;
  return { time, dashIndex: indent.length, message, messageIndex };
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
  let current: {
    time: string;
    offset: number;
    startOffset: number;
    bodyStartOffset: number;
    bodyLines: string[];
  } | null = null;

  const flush = (endOffset: number) => {
    if (!current) {
      return;
    }

    const rawMessage = current.bodyLines.join("\n").trimEnd();
    const metadata: Record<string, string> = {};
    const message = rawMessage
      .replace(/\[([^\]:]+)::([^\]]+)\]/g, (match, key, value) => {
        metadata[key.trim()] = value.trim();
        return "";
      })
      .trim();

    // Thino entries without body are allowed (empty message).
    entries.push({
      time: current.time,
      message,
      metadata,
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
    // If this line is a markdown task (checkbox), treat it as not part of Thino body.
    if (/^[ \t]*-\s*\[\s*[ xX]?\s*\]/.test(line)) {
      flush(offset);
      offset += rawLine.length + 1;
      continue;
    }
    if (timeBullet) {
      flush(offset);
      const bodyLines: string[] = [];
      let bodyStartOffset = offset + rawLine.length + 1;

      // If there's an inline message after the time, treat it as the first body line
      if (timeBullet.message != null && timeBullet.messageIndex != null) {
        bodyLines.push(deindentBodyLine(timeBullet.message));
        bodyStartOffset = offset + timeBullet.messageIndex;
      }

      current = {
        time: timeBullet.time,
        offset: offset + timeBullet.dashIndex,
        startOffset: offset,
        bodyStartOffset,
        bodyLines,
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
