import { WorkspaceLeaf } from "obsidian";
import type { Settings } from "src/settings";
import { MFDIView } from "src/ui/view/MFDIView";
import type { MFDIViewState } from "src/ui/view/state";
import { describe, expect, it, vi } from "vitest";

const fixedState: MFDIViewState = {
  displayMode: "focus",
  granularity: "day",
  asTask: false,
  threadOnly: false,
  fixedSessionNumber: 2,
  timeFilter: "all",
  dateFilter: "all",
  searchQuery: "",
  activeTopic: "",
  noteMode: "fixed",
  file: "MFDI/Inbox.mfdi.md",
};

describe("MFDIView external state revision", () => {
  it("changes only for state applied by Obsidian, not React partial updates", async () => {
    const view = new MFDIView(new WorkspaceLeaf(), {} as Settings);
    Object.defineProperty(view, "updateView", { value: vi.fn() });

    expect(view.getExternalStateRevision()).toBe(0);

    view.setStatePartial({ fixedSessionNumber: 2 });
    view.setStatePartial({ fixedSessionNumber: 1 });
    expect(view.getExternalStateRevision()).toBe(0);

    await view.setState(fixedState);
    expect(view.getExternalStateRevision()).toBe(1);
  });
});
