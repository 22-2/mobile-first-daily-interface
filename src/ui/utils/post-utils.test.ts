// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { toText } from "./post-utils";

// Mock moment
const mockMoment = (_ts?: string) => {
  return {
    format: (f: string) => {
      // Return specific format based on the request
      if (f === "YYYY-MM-DD HH:mm:ss") return "2026-03-02 16:00:00";
      if (f === "HH:mm:ss") return "16:00:00";
      return "mocked";
    },
    toISOString: () => "2026-03-02T16:00:00.000+09:00",
  } as any;
};

(window as any).moment = mockMoment;

describe("toText", () => {
  const postFormatThino = { type: "thino" } as any;

  test("thino format - day granularity uses only time", () => {
    const result = toText("test", false, postFormatThino, "day");
    expect(result).toBe("- 16:00:00 test\n");
  });

  test("thino format - other granularity uses full date time", () => {
    const result = toText("test", false, postFormatThino, "week");
    expect(result).toBe("- 2026-03-02 16:00:00 test\n");
  });

  test("task format - day granularity uses only time", () => {
    const result = toText("test", true, postFormatThino, "day");
    expect(result).toBe("- [ ] 16:00:00 test\n");
  });

  test("task format - other granularity uses full date time", () => {
    const result = toText("test", true, postFormatThino, "week");
    expect(result).toBe("- [ ] 2026-03-02 16:00:00 test\n");
  });
});
