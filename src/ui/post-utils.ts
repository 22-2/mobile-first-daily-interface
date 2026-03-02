import { PostFormat } from "../settings";
import { formatTaskText } from "../utils/task-text";
import { DATE_TIME_FORMAT, TIME_FORMAT } from "./date-formats";
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
  const ts = now.format(DATE_TIME_FORMAT);

  if (postFormat.type === "thino") {
    // 日ごと以外は年月日を追加。
    const timeFormat = granularity === "day" ? TIME_FORMAT : DATE_TIME_FORMAT;
    const time = now.format(timeFormat);
    const body = input
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((x) => (x.length === 0 ? "" : `    ${x}`))
      .join("\n");

    return (body.length === 0 ? `- ${time}` : `- ${time}\n${body}`) + "\n";
  }

  // codeblock と header は既に日付を含んでいる
  if (postFormat.type === "codeblock") {
    return `\`\`\`\`fw ${ts}\n${input}\n\`\`\`\`\n`;
  }

  return `${"#".repeat(postFormat.level)} ${ts}\n\n${input}\n`;
}
