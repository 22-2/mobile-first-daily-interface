import { DISPLAY_MODE } from "src/ui/config/consntants";
import { DateFilter, DisplayMode, Granularity, TimeFilter } from "src/ui/types";

export type MFDINoteMode = "periodic" | "fixed";

export interface MFDIViewCapabilities {
  supportsDateNavigation: boolean;
  supportsDisplayModeSwitch: boolean;
  supportsSidebar: boolean;
  supportsTopicSelection: boolean;
  supportsPeriodMenus: boolean;
  supportsMovePostBetweenDays: boolean;
}

export interface MFDIViewState extends Record<string, unknown> {
  displayMode: DisplayMode;
  granularity: Granularity;
  asTask: boolean;
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  activeTopic: string;
  noteMode: MFDINoteMode;
  fixedNotePath: string | null;
}

export const DEFAULT_MFDI_VIEW_STATE: MFDIViewState = {
  displayMode: DISPLAY_MODE.FOCUS,
  granularity: "day",
  asTask: false,
  timeFilter: "all",
  dateFilter: "today",
  activeTopic: "",
  noteMode: "periodic",
  fixedNotePath: null,
};

export function getMFDIViewCapabilities(
  state: Pick<MFDIViewState, "noteMode">,
): MFDIViewCapabilities {
  if (state.noteMode === "fixed") {
    return {
      supportsDateNavigation: false,
      supportsDisplayModeSwitch: false,
      supportsSidebar: false,
      supportsTopicSelection: false,
      supportsPeriodMenus: false,
      supportsMovePostBetweenDays: false,
    };
  }

  return {
    supportsDateNavigation: true,
    supportsDisplayModeSwitch: true,
    supportsSidebar: true,
    supportsTopicSelection: true,
    supportsPeriodMenus: true,
    supportsMovePostBetweenDays: true,
  };
}

export function createFixedNoteViewState(filePath: string): MFDIViewState {
  return {
    ...DEFAULT_MFDI_VIEW_STATE,
    noteMode: "fixed",
    fixedNotePath: filePath,
    displayMode: DISPLAY_MODE.FOCUS,
  };
}

export function getFixedNoteTitle(path: string | null): string {
  if (!path) return "Fixed Note";
  const segments = path.replace(/\\/g, "/").split("/");
  return segments[segments.length - 1].replace(/\.mfdi\.md$/, "") || "Fixed Note";
}
