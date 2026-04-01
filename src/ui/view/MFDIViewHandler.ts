import type {
  DateFilter,
  DisplayMode,
  Granularity,
  TimeFilter,
} from "src/ui/types";

export interface MFDIViewHandler {
  onOpenDailyNoteAction?: () => void;
  onChangeGranularity?: (g: Granularity) => void;
  onChangeAsTask?: (asTask: boolean) => void;
  onChangeThreadOnly?: (threadOnly: boolean) => void;
  onChangeTimeFilter?: (f: TimeFilter) => void;
  onChangeDateFilter?: (f: DateFilter) => void;
  onSearchQueryChange?: (query: string) => void;
  onChangeDisplayMode?: (mode: DisplayMode) => void;
  onOpenModalEditor?: () => void;
  onSubmit?: () => Promise<void>;
  onChangeTopic?: (topicId: string) => void;
  onTopicSaveRequested?: (topicId: string) => Promise<void>;
  onOpenTopicManager?: () => void;
  onFocusRequested?: () => void;
  onToggleSidebar?: () => void;
  onCopyAllPosts?: () => void;
  onOpenDraftList?: () => void;
  onSetLiveEditorContentForTesting?: (content: string) => void;
  onGetLiveEditorContentForTesting?: () => string;
  onGetDebugStateForTesting?: () => {
    settingsDateIso: string;
    displayMode: DisplayMode;
    activeTopic: string;
    inputSnapshot: string;
    editingPostMessage: string | null;
    persistedInput: string;
    editorSnapshot: string | null;
  };
}
