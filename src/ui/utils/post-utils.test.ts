// @vitest-environment jsdom
import { toText } from "src/ui/utils/post-utils";
import { beforeEach, describe, expect, test, vi } from "vitest";

beforeEach(() => {
  // Fix "now" to a specific date for tests that use window.moment()
  vi.setSystemTime(new Date("2026-03-02T16:00:00.000+09:00"));
});

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

  test("thino format - should NOT filter hidden metadata", () => {
    const result = toText("test", false, "day", undefined, {
      archived: "true",
      deleted: "20260101000000",
      posted: "2026-03-10T19:00:00.00Z",
    });
    // archived and deleted should NOT be hidden
    expect(result).toBe(
      "- 16:00:00 test\n    [archived::true]\n    [deleted::20260101000000]\n    [posted::2026-03-10T19:00:00.00Z]\n",
    );
  });

  test("thino format - trims redundant empty lines", () => {
    const result = toText("test\n\n\n", false, "day");
    expect(result).toBe("- 16:00:00 test\n");
  });

  test("thino format - with metadata at the end of first line", () => {
    const result = toText("ggg (from 2026-03-10)", false, "day", undefined, {
      posted: "2026-03-10T10:18:13.546Z",
    });
    expect(result).toBe(
      "- 16:00:00 ggg (from 2026-03-10) [posted::2026-03-10T10:18:13.546Z]\n",
    );
  });

  test("thino format - multi-line with metadata", () => {
    const result = toText(
      "zustandを始めて使ったときは衝撃だったな\nむかしはcontextproviderの順番でやきもきしてたから",
      false,
      "day",
      undefined,
      {
        key1: "val1",
      },
    );
    expect(result).toBe(
      "- 16:00:00 zustandを始めて使ったときは衝撃だったな [key1::val1]\n    むかしはcontextproviderの順番でやきもきしてたから\n",
    );
  });

  test("thino format - multiple metadata are written on separate lines", () => {
    const result = toText("test", false, "day", undefined, {
      mfdiThreadRootId: "cc73160c",
      posted: "2026-03-10T10:18:13.546Z",
    });

    expect(result).toBe(
      "- 16:00:00 test\n    [mfdiThreadRootId::cc73160c]\n    [posted::2026-03-10T10:18:13.546Z]\n",
    );
  });

  test("thino format - should NOT filter archived and deleted metadata", () => {
    const result = toText("test", false, "day", undefined, {
      archived: "20260311195539",
      deleted: "20260311195539",
    });
    expect(result).toContain("[archived::20260311195539]");
    expect(result).toContain("[deleted::20260311195539]");
  });
});
