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
  supportsTags: boolean;
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

export function createDefaultMFDIViewState(params?: {
  noteMode?: MFDINoteMode;
  fixedNotePath?: string | null;
}): MFDIViewState {
  const { noteMode = "periodic", fixedNotePath = null } = params ?? {};

  if (noteMode === "fixed") {
    // fixedノートの既定値をここに集約し、React側の再同期でperiodic既定値へ戻るのを防ぐ。
    return {
      ...DEFAULT_MFDI_VIEW_STATE,
      noteMode,
      fixedNotePath,
      displayMode: DISPLAY_MODE.FOCUS,
      dateFilter: "all",
    };
  }

  return {
    ...DEFAULT_MFDI_VIEW_STATE,
    noteMode,
    fixedNotePath: null,
  };
}

export function getMFDIViewCapabilities(
  state: Pick<MFDIViewState, "noteMode">,
): MFDIViewCapabilities {
  if (state.noteMode === "fixed") {
    return {
      supportsDateNavigation: false,
      supportsDisplayModeSwitch: false,
      supportsSidebar: false,
      supportsTopicSelection: false,
      supportsPeriodMenus: true,
      supportsMovePostBetweenDays: false,
      supportsTags: false,
    };
  }

  return {
    supportsDateNavigation: true,
    supportsDisplayModeSwitch: true,
    supportsSidebar: true,
    supportsTopicSelection: true,
    supportsPeriodMenus: true,
    supportsMovePostBetweenDays: true,
    supportsTags: true,
  };
}

export function createFixedNoteViewState(filePath: string): MFDIViewState {
  return createDefaultMFDIViewState({
    noteMode: "fixed",
    fixedNotePath: filePath,
  });
}

export function getFixedNoteTitle(path: string | null): string {
  if (!path) return "Fixed Note";
  const segments = path.replace(/\\/g, "/").split("/");
  return (
    segments[segments.length - 1].replace(/\.mfdi\.md$/, "") || "Fixed Note"
  );
}
