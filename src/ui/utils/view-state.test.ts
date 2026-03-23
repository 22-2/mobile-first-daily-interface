import { describe, expect, it } from "vitest";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { isDefaultViewState, getCenterIndicatorLabel } from "src/ui/utils/view-state";

describe("view-state utilities", () => {
  it("activeTag があるとデフォルト扱いにしない", () => {
    expect(
      isDefaultViewState({
        displayMode: DISPLAY_MODE.TIMELINE,
        granularity: "day",
        dateFilter: "today",
        timeFilter: "all",
        asTask: false,
        activeTag: "IT",
        threadFocusRootId: null,
      }),
    ).toBe(false);
  });

  it("タグ表示中は center ラベルを優先する", () => {
    expect(
      getCenterIndicatorLabel({
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: "root-1",
        activeTag: "IT",
      }),
    ).toBe("タグ表示中");
  });
});
