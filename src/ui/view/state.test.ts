import {
  createFixedNoteViewState,
  getMFDIViewCapabilities,
} from "src/ui/view/state";
import { describe, expect, it } from "vitest";

describe("MFDI view state", () => {
  it("fixed mode では日付系 capability を無効化する", () => {
    expect(getMFDIViewCapabilities({ noteMode: "fixed" })).toEqual({
      supportsDateNavigation: false,
      supportsDisplayModeSwitch: false,
      supportsSidebar: false,
      supportsTopicSelection: false,
      supportsPeriodMenus: false,
      supportsMovePostBetweenDays: false,
    });
  });

  it("fixed note view state を focus ベースで構築する", () => {
    expect(createFixedNoteViewState("Inbox.md")).toMatchObject({
      noteMode: "fixed",
      fixedNotePath: "Inbox.md",
      displayMode: "focus",
      dateFilter: "today",
      timeFilter: "all",
    });
  });
});
