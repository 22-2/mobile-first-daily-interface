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
    });

    const { getByText } = render(<MiniCalendar />);
    expect(getByText("2026年 3月")).toBeDefined();
  });
});
