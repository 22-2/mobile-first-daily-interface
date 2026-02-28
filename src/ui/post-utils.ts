import { PostFormat } from "../settings";
import { formatTaskText } from "../utils/task-text";
import { DATE_TIME_FORMAT, TIME_FORMAT } from "./date-formats";
import { Granularity } from "./types";

export function toText(
  input: string,
  asTask: boolean,
  postFormat: PostFormat,
  granularity: Granularity
): string {
  if (asTask) {
    return formatTaskText(input);
  }

  const ts = window.moment().toISOString(true);

  if (postFormat.type === "thino") {
    // 日ごと以外は年月日を追加。
    const timeFormat = granularity === "day" ? TIME_FORMAT : DATE_TIME_FORMAT;
    const time = window.moment().format(timeFormat);
    const body = input
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((x) => (x.length === 0 ? "" : `    ${x}`))
      .join("\n");

    return `
- ${time}
${body}
`;
  }

  // codeblock と header (ISO 8601) は既に日付を含んでいる
  if (postFormat.type === "codeblock") {
    return `
\`\`\`\`fw ${ts}
${input}
\`\`\`\`
`;
  }

  return `
${"#".repeat(postFormat.level)} ${ts}

${input}
`;
}
