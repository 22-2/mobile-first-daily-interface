import { PostFormat } from "../settings";
import { formatTaskText } from "../utils/task-text";
import { DATE_TIME_FORMAT } from "./date-formats";
import { Granularity, MomentLike } from "./types";

export function toText(
  input: string,
  asTask: boolean,
  postFormat: PostFormat,
  granularity: Granularity,
  timestamp?: MomentLike
): string {
  if (asTask) {
    return formatTaskText(input) + "\n";
  }

  const now = timestamp ?? window.moment();

  // 常に年月日を記録する。
  const time = now.format(DATE_TIME_FORMAT);
  const body = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((x) => (x.length === 0 ? "" : `    ${x}`))
    .join("\n");

  return (body.length === 0 ? `- ${time}` : `- ${time}\n${body}`) + "\n";
}
