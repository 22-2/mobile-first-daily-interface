import { granularityConfig } from "src/ui/config/granularity-config";
import { describe, expect, it } from "vitest";

// ─────────────────────────────────────────────────────────────────
// granularityConfig — UI 表示設定の静的値テスト
// ─────────────────────────────────────────────────────────────────
describe("granularityConfig", () => {
  const granularities = ["day", "week", "month", "year"] as const;

  it.each(granularities)("'%s' に必要なフィールドが全て存在する", (g) => {
    const cfg = granularityConfig[g];
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
    expect(granularityConfig.day.showWeekday).toBe(true);
    expect(granularityConfig.week.showWeekday).toBe(false);
    expect(granularityConfig.month.showWeekday).toBe(false);
    expect(granularityConfig.year.showWeekday).toBe(false);
  });

  it("todayLabel の値が granularity ごとに正しい", () => {
    expect(granularityConfig.day.todayLabel).toBe("今日");
    expect(granularityConfig.week.todayLabel).toBe("今週");
    expect(granularityConfig.month.todayLabel).toBe("今月");
    expect(granularityConfig.year.todayLabel).toBe("今年");
  });
});
