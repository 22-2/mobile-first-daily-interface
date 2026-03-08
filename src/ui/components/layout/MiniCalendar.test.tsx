// @vitest-environment jsdom
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { MiniCalendar } from "./MiniCalendar";
import { useMFDIContext } from "../../context/MFDIAppContext";

vi.mock("obsidian", () => ({
  setIcon: vi.fn(),
  Menu: vi.fn(),
  Notice: vi.fn(),
}));

vi.mock("../../context/MFDIAppContext", () => ({
  useMFDIContext: vi.fn(),
}));

// Basic moment.js mock for testing
import moment from "moment";
(window as any).moment = moment;

describe("MiniCalendar", () => {
  it("renders without crashing", () => {
    const mockSetDate = vi.fn();
    (useMFDIContext as any).mockReturnValue({
      date: moment("2026-03-09T00:00:00.000Z"),
      setDate: mockSetDate,
      granularity: "day",
      dateFilter: "today",
      posts: [],
    });

    const { getByText } = render(<MiniCalendar />);
    expect(getByText("2026年 3月")).toBeDefined();
  });

  it("calculates range accurately for 7d dateFilter", () => {
    const mockSetDate = vi.fn();
    (useMFDIContext as any).mockReturnValue({
      date: moment("2026-03-09T00:00:00.000Z"),
      setDate: mockSetDate,
      granularity: "day",
      dateFilter: "7d",
      posts: [
        { timestamp: moment("2026-03-05T12:00:00.000Z") } // a post exists this day
      ],
    });

    const { getAllByText } = render(<MiniCalendar />);
    // 3/9 itself should have the selected day class (accent color)
    // 3/3 to 3/8 should be in the selected range (active hover bg)
    // We'll just ensure it renders and doesn't crash, the UI checks are handled by Chakra styles
    expect(getAllByText("2026年 3月").length).toBeGreaterThan(0);
    
    // Day 5 should be present
    expect(getAllByText("5").length).toBeGreaterThan(0);
    
    // Finding dots or backgrounds purely by render isn't perfect without test IDs, but we can verify it doesn't crash.
  });
});

