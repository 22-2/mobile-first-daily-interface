import {
    DATE_FORMAT,
    DATE_TIME_FORMAT,
    TIME_FORMAT
} from "src/ui/config/date-formats";
import { Granularity, MomentLike } from "src/ui/types";
import { formatTaskText } from "src/utils/task-text";

export function toText(
  input: string,
  asTask: boolean,
  granularity: Granularity,
  timestamp?: MomentLike,
  metadata: Record<string, string> = {},
): string {
  if (input.trim().length === 0) {
    return "";
  }

  const now = timestamp ?? window.moment();
  const timeStr =
    granularity === "day"
      ? now.format(TIME_FORMAT)
      : now.format(DATE_TIME_FORMAT);

  if (asTask) {
    return formatTaskText(input, timeStr) + "\n";
  }

  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const lines = normalized.split("\n");
  const firstLine = lines[0];
  const restLines = lines.slice(1);
  const metadataEntries = Object.entries(metadata);

  const inlineMetaStr = metadataEntries.length <= 1
    ? metadataEntries
    .map(([k, v]) => ` [${k}::${v}]`)
    .join("")
    : "";

  const head = `- ${timeStr} ${firstLine}${inlineMetaStr}`;

  const bodyLines = restLines
    .map((x) => (x.length === 0 ? "" : `    ${x}`))
    .filter((x, index, array) => {
      if (x.length > 0) {
        return true;
      }
      return index < array.length - 1;
    });

  const metadataLines = metadataEntries.length > 1
    ? metadataEntries.map(([k, v]) => `    [${k}::${v}]`)
    : [];

  const trailingLines = [...bodyLines, ...metadataLines];

  if (trailingLines.length === 0) {
    return head + "\n";
  }

  return `${head}\n${trailingLines.join("\n")}\n`;
}

export function resolveTimestamp(
  time: string,
  date: MomentLike,
  metadata?: Record<string, string>,
): MomentLike {
  // Priority: posted metadata (ISO string) > combined datetime
  if (metadata?.posted) {
    const m = window.moment(metadata.posted);
    if (m.isValid()) return m;
  }

  const hasDate = time.includes("-");
  return hasDate
    ? window.moment(time, DATE_TIME_FORMAT)
    : window.moment(`${date.format(DATE_FORMAT)} ${time}`, DATE_TIME_FORMAT);
}
