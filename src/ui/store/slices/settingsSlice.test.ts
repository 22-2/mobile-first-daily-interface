// @vitest-environment jsdom
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { settingsStore } from "src/ui/store/settingsStore";
import {
  isPastDateReadOnly,
  isViewReadOnly,
} from "src/ui/store/slices/settingsSlice";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("settingsSlice", () => {
  const today = window.moment("2026-03-16T09:00:00.000Z");
  const yesterday = today.clone().subtract(1, "day");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(today.toDate());
    settingsStore.setState({
      pluginSettings: {
        postFormatOption: "Thino",
        insertAfter: "## Thino",
        enabledCardView: true,
        allowEditingPastNotes: false,
        updateDateStrategy: "never",
        topics: [],
        activeTopic: "",
      },
      granularity: "day",
      date: today.clone(),
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
  });

  it("過去ノート編集設定がオフなら過去日は読み取り専用になる", () => {
    expect(
      isPastDateReadOnly({
        date: yesterday,
        granularity: "day",
        allowEditingPastNotes: false,
      }),
    ).toBe(true);

    expect(
      isViewReadOnly({
        date: yesterday,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        allowEditingPastNotes: false,
      }),
    ).toBe(true);
  });

  it("過去ノート編集設定がオンなら過去日でも読み取り専用にならない", () => {
    expect(
      isPastDateReadOnly({
        date: yesterday,
        granularity: "day",
        allowEditingPastNotes: true,
      }),
    ).toBe(false);

    settingsStore.setState((state) => ({
      ...state,
      pluginSettings: {
        ...state.pluginSettings!,
        allowEditingPastNotes: true,
      },
      date: yesterday.clone(),
    }));

    expect(settingsStore.getState().isReadOnly()).toBe(false);
    expect(settingsStore.getState().isDateReadOnly(yesterday)).toBe(false);
  });

  it("スレッドを開くと対象ノートの日付に同期する", () => {
    settingsStore.getState().setThreadFocusRootId("root-1", yesterday);

    const state = settingsStore.getState();
    expect(state.threadFocusRootId).toBe("root-1");
    expect(state.displayMode).toBe(DISPLAY_MODE.FOCUS);
    expect(state.date.isSame(yesterday, "day")).toBe(true);
  });
});
