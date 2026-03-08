import { PostFormat } from "src/settings";
import { formatTaskText } from "src/utils/task-text";
import { DATE_TIME_FORMAT, TIME_FORMAT } from "../config/date-formats";
import { Granularity, MomentLike } from "../types";

export function toText(
  input: string,
  asTask: boolean,
  postFormat: PostFormat,
  granularity: Granularity,
  timestamp?: MomentLike,
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

  const head = `- ${timeStr} ${firstLine}`;
  if (restLines.length === 0) {
    return head + "\n";
  }

  const body = restLines
    .map((x) => (x.length === 0 ? "" : `    ${x}`))
    .join("\n");

  return `${head}\n${body}\n`;
}
