export function formatTaskText(input: string, time?: string): string {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const t = time ?? (typeof window !== "undefined" ? window.moment().format("HH:mm:ss") : "00:00:00");

  // single-line -> put content on same line after time
  if (!normalized.includes("\n")) {
    const content = normalized.trim();
    return `\n- [ ] ${t}${content.length === 0 ? "" : " " + content}\n`;
  }

  // multi-line -> time on its own line, body indented
  const trimmed = normalized.replace(/\n+$/g, "");
  const body = trimmed
    .split("\n")
    .map((x) => (x.length === 0 ? "" : `    ${x}`))
    .join("\n");

  return `\n- [ ] ${t}\n${body}\n`;
}
