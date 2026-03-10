import { DateFilter, DisplayMode, Granularity, TimeFilter } from "../types";

export class MFDIViewHandler {
  onOpenDailyNoteAction?: () => void;
  onChangeGranularity?: (g: Granularity) => void;
  onChangeAsTask?: (asTask: boolean) => void;
  onChangeTimeFilter?: (f: TimeFilter) => void;
  onChangeDateFilter?: (f: DateFilter) => void;
  onChangeDisplayMode?: (mode: DisplayMode) => void;
  onOpenModalEditor?: () => void;
  onSubmit?: () => Promise<void>;
  onChangeTopic?: (topicId: string) => void;
  onTopicSaveRequested?: (topicId: string) => Promise<void>;
  onOpenTopicManager?: () => void;
  onFocusRequested?: () => void;
  onToggleSidebar?: () => void;
}
