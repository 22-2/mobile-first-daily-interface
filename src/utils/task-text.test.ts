import { formatTaskText } from "src/utils/task-text";
import { describe, expect, test } from "vitest";

describe("formatTaskText", () => {
  test("single-line includes time and content inline", () => {
    const out = formatTaskText("hello", "12:34:56");
    expect(out).toBe(`- [ ] 12:34:56 hello`);
  });

  test("empty single-line includes only time", () => {
    const out = formatTaskText("", "01:02:03");
    expect(out).toBe(`- [ ] 01:02:03`);
  });

  test("multi-line creates inline first line and indented rest", () => {
    const out = formatTaskText("a\nb\n", "23:59:59");
    expect(out).toBe(`- [ ] 23:59:59 a\n    b`);
  });
});
