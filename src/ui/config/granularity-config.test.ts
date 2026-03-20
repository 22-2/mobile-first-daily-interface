import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { describe, expect, it } from "vitest";

// ─────────────────────────────────────────────────────────────────
// GRANULARITY_CONFIG — UI 表示設定の静的値テスト
// ─────────────────────────────────────────────────────────────────
describe("GRANULARITY_CONFIG", () => {
  const granularities = ["day", "week", "month", "year"] as const;

  it.each(granularities)("'%s' に必要なフィールドが全て存在する", (g) => {
    const cfg = GRANULARITY_CONFIG[g];
    expect(cfg.label).toBeTruthy();
    expect(cfg.menuLabel).toBeTruthy();
    expect(cfg.todayLabel).toBeTruthy();
    expect(cfg.unit).toBe(g);
    expect(cfg.inputType).toBeTruthy();
    expect(cfg.inputFormat).toBeTruthy();
    expect(cfg.displayFormat).toBeTruthy();
    expect(typeof cfg.parseInput).toBe("function");
    expect(typeof cfg.showWeekday).toBe("boolean");
  });

  it("day だけ showWeekday が true", () => {
    expect(GRANULARITY_CONFIG.day.showWeekday).toBe(true);
    expect(GRANULARITY_CONFIG.week.showWeekday).toBe(false);
    expect(GRANULARITY_CONFIG.month.showWeekday).toBe(false);
    expect(GRANULARITY_CONFIG.year.showWeekday).toBe(false);
  });

  it("todayLabel の値が granularity ごとに正しい", () => {
    expect(GRANULARITY_CONFIG.day.todayLabel).toBe("今日");
    expect(GRANULARITY_CONFIG.week.todayLabel).toBe("今週");
    expect(GRANULARITY_CONFIG.month.todayLabel).toBe("今月");
    expect(GRANULARITY_CONFIG.year.todayLabel).toBe("今年");
  });
});
