import { formatTaskText } from "../../utils/task-text";
import { DATE_FORMAT, DATE_TIME_FORMAT, TIME_FORMAT } from "../config/date-formats";
import { Granularity, MomentLike } from "../types";

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

  const metaStr = Object.entries(metadata)
    .filter(([k]) => k !== "archived" && k !== "deleted")
    .map(([k, v]) => ` [${k}::${v}]`)
    .join("");

  const head = `- ${timeStr} ${firstLine}${metaStr}`;
  if (restLines.length === 0) {
    return head + "\n";
  }

  const body = restLines
    .map((x) => (x.length === 0 ? "" : `    ${x}`))
    .join("\n");

  return `${head}\n${body}\n`;
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
