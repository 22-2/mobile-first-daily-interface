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
  test("thino format - day granularity uses only time", () => {
    const result = toText("test", false, "day");
    expect(result).toBe("- 16:00:00 test\n");
  });

  test("thino format - other granularity uses full date time", () => {
    const result = toText("test", false, "week");
    expect(result).toBe("- 2026-03-02 16:00:00 test\n");
  });

  test("task format - day granularity uses only time", () => {
    const result = toText("test", true, "day");
    expect(result).toBe("- [ ] 16:00:00 test\n");
  });

  test("task format - other granularity uses full date time", () => {
    const result = toText("test", true, "week");
    expect(result).toBe("- [ ] 2026-03-02 16:00:00 test\n");
  });

  test("thino format - with metadata", () => {
    const result = toText("test", false, "day", undefined, {
      other: "value",
    });
    expect(result).toBe("- 16:00:00 test [other::value]\n");
  });

  test("thino format - filters hidden metadata", () => {
    const result = toText("test", false, "day", undefined, {
      archived: "true",
      deleted: "20260101000000",
      posted: "2026-03-10T19:00:00.00Z",
    });
    // archived and deleted should be hidden, but posted should remain
    expect(result).toBe("- 16:00:00 test [posted::2026-03-10T19:00:00.00Z]\n");
  });

  test("thino format - trims redundant empty lines", () => {
    const result = toText("test\n\n\n", false, "day");
    expect(result).toBe("- 16:00:00 test\n");
  });
});
