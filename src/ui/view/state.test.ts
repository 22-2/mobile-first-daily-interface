import {
  createFixedNoteViewState,
  getMFDIViewCapabilities
} from "src/ui/view/state";
import { describe, expect, it } from "vitest";

describe("MFDI view state", () => {
  it("fixed mode では相対期間だけを許可し、それ以外の capability を抑制する", () => {
    expect(getMFDIViewCapabilities({ noteMode: "fixed" })).toEqual({
      supportsDateNavigation: false,
      supportsDisplayModeSwitch: false,
      supportsSidebar: false,
      supportsTopicSelection: false,
      supportsPeriodMenus: true,
      supportsMovePostBetweenDays: false,
      supportsTags: false,
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
