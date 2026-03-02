// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { toText } from "./post-utils";

// Mock moment
const mockMoment = (ts?: string) => {
  return {
    format: (f: string) => {
      if (f === "HH:mm:ss") return "16:00:00";
      return "2026-03-02 16:00:00";
    },
    toISOString: () => "2026-03-02T16:00:00.000+09:00",
  } as any;
};

(window as any).moment = mockMoment;

describe("toText", () => {
  const postFormatThino = { type: "thino" } as any;
  const postFormatHeader = { type: "header", level: 3 } as any;
  const postFormatCodeblock = { type: "codeblock" } as any;

  test("thino format without body", () => {
    const result = toText("test", false, postFormatThino, "day");
    expect(result).toMatch(/^- \d{2}:\d{2}:\d{2}\n    test\n$/);
  });

  test("header format", () => {
    const result = toText("test", false, postFormatHeader, "day");
    expect(result).toMatch(/^### .*\n\ntest\n$/);
  });

  test("codeblock format", () => {
    const result = toText("test", false, postFormatCodeblock, "day");
    expect(result).toMatch(/^````fw .*\ntest\n````\n$/);
  });

  test("simulated update: should not merge with next post", () => {
    const input = "new message";
    const ts = window.moment("2026-03-02 16:00:00", "YYYY-MM-DD HH:mm:ss");
    const result = toText(input, false, postFormatThino, "day", ts);
    
    expect(result).toBe("- 16:00:00\n    new message\n");
    
    // Simulation of replacement:
    const origin = "- 16:00:00\n    old\n- 16:01:00\n    next";
    const start = 0;
    const end = origin.indexOf("- 16:01:00");
    const updated = origin.slice(0, start) + result + origin.slice(end);
    
    expect(updated).toBe("- 16:00:00\n    new message\n- 16:01:00\n    next");
  });
});
