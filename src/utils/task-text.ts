export function formatTaskText(input: string, time?: string): string {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const t = time ?? (typeof window !== "undefined" ? window.moment().format("HH:mm:ss") : "00:00:00");

  // single-line -> put content on same line after time
  if (!normalized.includes("\n")) {
    const content = normalized.trim();
    return `- [ ] ${t}${content.length === 0 ? "" : " " + content}`;
  }

  // multi-line -> time on its own line, body indented
  const body = normalized
    .split("\n")
    .map((x) => (x.length === 0 ? "" : `    ${x}`))
    .join("\n");

  return `- [ ] ${t}\n${body}`;
}
