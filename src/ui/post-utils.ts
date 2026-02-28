import { PostFormat } from "../settings";
import { formatTaskText } from "../utils/task-text";

export function toText(
  input: string,
  asTask: boolean,
  postFormat: PostFormat
): string {
  if (asTask) {
    return formatTaskText(input);
  }

  const ts = window.moment().toISOString(true);

  if (postFormat.type === "thino") {
    const time = window.moment().format("HH:mm:ss");
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
