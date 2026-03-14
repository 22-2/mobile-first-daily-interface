// @vitest-environment jsdom
import { settingsStore } from "src/ui/store/settingsStore";
import { resolveTimelineBaseDate } from "src/ui/hooks/internal/useInfiniteTimeline";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("useInfiniteTimeline", () => {
  const today = window.moment("2026-03-15T09:00:00.000Z");
  const yesterday = today.clone().subtract(1, "day");

  beforeEach(() => {
    vi.clearAllMocks();

    settingsStore.setState({
      activeTopic: "",
      granularity: "day",
      date: yesterday.clone(),
      timeFilter: "all",
      dateFilter: "today",
      sidebarOpen: true,
      displayMode: "timeline",
      asTask: false,
      getEffectiveDate: () => today.clone(),
    });
  });

  it("タイムライン初回取得はフォーカス中の日付ではなく今日を基準にする", () => {
    const result = resolveTimelineBaseDate(null);

    expect(result.isSame(today, "day")).toBe(true);
    expect(result.isSame(yesterday, "day")).toBe(false);
  });

  it("次ページ取得時は pageParam を優先する", () => {
    const pageParam = yesterday.clone().format();
    const result = resolveTimelineBaseDate(pageParam);

    expect(result.isSame(yesterday, "day")).toBe(true);
  });
});
