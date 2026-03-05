// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { toText } from "./post-utils";

// Mock moment
const mockMoment = (_ts?: string) => {
  return {
    format: (_f: string) => {
      return "2026-03-02 16:00:00";
    },
    toISOString: () => "2026-03-02T16:00:00.000+09:00",
  } as any;
};

(window as any).moment = mockMoment;

describe("toText", () => {
  const postFormatThino = { type: "thino" } as any;

  test("thino format - always includes date", () => {
    const result = toText("test", false, postFormatThino, "day");
    expect(result).toMatch(/^- \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\n    test\n$/);
  });

  test("simulated update: should not merge with next post", () => {
    const input = "new message";
    const ts = window.moment("2026-03-02 16:00:00", "YYYY-MM-DD HH:mm:ss");
    const result = toText(input, false, postFormatThino, "day", ts);

    expect(result).toBe("- 2026-03-02 16:00:00\n    new message\n");

    // Simulation of replacement:
    const origin = "- 2026-03-02 16:00:00\n    old\n- 2026-03-02 16:01:00\n    next";
    const start = 0;
    const end = origin.indexOf("- 2026-03-02 16:01:00");
    const updated = origin.slice(0, start) + result + origin.slice(end);

    expect(updated).toBe("- 2026-03-02 16:00:00\n    new message\n- 2026-03-02 16:01:00\n    next");
  });
});
