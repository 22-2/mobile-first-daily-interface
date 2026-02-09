import { describe, expect, test } from "@jest/globals";
import { formatTaskText } from "./task-text";

describe("formatTaskText", () => {
  test("single-line includes time and content inline", () => {
    const out = formatTaskText("hello", "12:34:56");
    expect(out).toBe(`\n- [ ] 12:34:56 hello\n`);
  });

  test("empty single-line includes only time", () => {
    const out = formatTaskText("", "01:02:03");
    expect(out).toBe(`\n- [ ] 01:02:03\n`);
  });

  test("multi-line creates indented body", () => {
    const out = formatTaskText("a\nb\n", "00:00:00");
    expect(out).toBe(`\n- [ ] 00:00:00\n    a\n    b\n`);
  });
});
