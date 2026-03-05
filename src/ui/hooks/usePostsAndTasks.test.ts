// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { resolveTimestamp } from "./usePostsAndTasks";

// moment の最小限のモック
const makeMockMoment = (formatted: string) => ({
  format: (_f: string) => formatted,
  unix: () => 0,
  isSame: () => false,
});

// window.moment をモック（日付あり形式のパース用）
(window as any).moment = (value: string, _format?: string) => ({
  format: (_f: string) => value,
  unix: () => 0,
  isSame: () => false,
});

describe("resolveTimestamp", () => {
  const dateFor20260302 = makeMockMoment("2026-03-02") as any;

  test("時刻のみ（旧形式）: 日付ファイルの日付を補完してパースする", () => {
    const result = resolveTimestamp("16:00:00", dateFor20260302);
    // `${date.format(DATE_FORMAT)} ${time}` = "2026-03-02 16:00:00" でパースされること
    expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2026-03-02 16:00:00");
  });

  test("日付あり（新形式）: そのままパースする", () => {
    const result = resolveTimestamp("2026-03-05 09:30:00", dateFor20260302);
    // 日付ファイルの日付（03-02）は使われず、エントリ自体の日付（03-05）が使われること
    expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2026-03-05 09:30:00");
  });

  test("時刻のみ（旧形式）: 日付が異なるノートを参照した場合、そちらの日付が使われる", () => {
    const dateFor20251225 = makeMockMoment("2025-12-25") as any;
    const result = resolveTimestamp("23:59:59", dateFor20251225);
    expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2025-12-25 23:59:59");
  });
});
