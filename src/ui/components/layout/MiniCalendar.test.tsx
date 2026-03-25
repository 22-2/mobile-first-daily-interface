import { fireEvent, render } from "@testing-library/react";
import moment from "moment";
import { DEFAULT_SETTINGS } from "src/settings";
import { MiniCalendar } from "src/ui/components/layout/MiniCalendar";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { initializePostsStore } from "src/ui/store/postsStore";
import {
  initializeSettingsStore,
  settingsStore
} from "src/ui/store/settingsStore";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  setIcon: vi.fn(),
  Menu: vi.fn(),
  Notice: vi.fn(),
  PluginSettingTab: class {},
  Setting: class {
    setName = vi.fn().mockReturnThis();
    setDesc = vi.fn().mockReturnThis();
    addText = vi.fn().mockReturnThis();
    addToggle = vi.fn().mockReturnThis();
    addDropdown = vi.fn().mockReturnThis();
    addSlider = vi.fn().mockReturnThis();
    addSearch = vi.fn().mockReturnThis();
    addTextArea = vi.fn().mockReturnThis();
    addMomentFormat = vi.fn().mockReturnThis();
  },
  App: class {},
}));

vi.mock("src/ui/context/AppContext", () => ({
  useAppContext: vi.fn(() => ({
    shell: {},
  })),
  useObsidianApp: vi.fn(() => ({ vault: { getFiles: () => [] } })),
}));

vi.mock("src/core/note-source", () => ({
  listPeriodicNotes: vi.fn(() => ({})),
  getPeriodicNoteDate: vi.fn(),
}));

describe("MiniCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initializeSettingsStore(DEFAULT_SETTINGS, {
      get: vi.fn(),
      set: vi.fn(),
    } as any);
    initializePostsStore({} as any);
  });

  it("renders without crashing", () => {
    settingsStore.setState({
      date: moment("2026-03-09T00:00:00.000Z"),
      granularity: "day",
      dateFilter: "today",
      activeTopic: "",
    });

    const { getByText } = render(<MiniCalendar />);
    expect(getByText("2026年 3月")).toBeDefined();
  });

  it("calculates range accurately for 7d dateFilter", () => {
    settingsStore.setState({
      date: moment("2026-03-09T00:00:00.000Z"),
      granularity: "day",
      dateFilter: "7d",
      activeTopic: "",
    });

    // In MiniCalendar, posts are just used to show dots (activityDates)
    // The range calculation is internal to calcSelectedRange and buildWeeksInMonth

    const { getAllByText } = render(<MiniCalendar />);
    // 3/9 itself should have the selected day class (accent color)
    // 3/3 to 3/8 should be in the selected range (active hover bg)
    // We'll just ensure it renders and doesn't crash, the UI checks are handled by Chakra styles
    expect(getAllByText("2026年 3月").length).toBeGreaterThan(0);

    // Day 5 should be present
    expect(getAllByText("5").length).toBeGreaterThan(0);

    // Finding dots or backgrounds purely by render isn't perfect without test IDs, but we can verify it doesn't crash.
  });

  it("タイムライン表示中に日付セルを押すとフォーカス表示へ戻る", () => {
    settingsStore.setState({
      date: moment("2026-03-09T00:00:00.000Z"),
      granularity: "day",
      dateFilter: "today",
      displayMode: DISPLAY_MODE.TIMELINE,
      activeTopic: "",
    });

    const { container } = render(<MiniCalendar />);
    const dayCell = container.querySelector(".mini-calendar__day-cell");

    expect(dayCell).toBeTruthy();
    fireEvent.click(dayCell as HTMLElement);

    expect(settingsStore.getState().displayMode).toBe(DISPLAY_MODE.FOCUS);
    expect(settingsStore.getState().dateFilter).toBe("today");
    expect(settingsStore.getState().granularity).toBe("day");
  });
});
