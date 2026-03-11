import { useEffect, useRef } from "react";
import { Task } from "src/app-helper";
import { ObsidianLiveEditorRef } from "src/ui/components/common/ObsidianLiveEditor";
import { useAppContext } from "src/ui/context/AppContext";
import { MFDIModal } from "src/ui/modals/MFDIModal";
import { DateFilter, DisplayMode, Granularity, Post, TimeFilter } from "src/ui/types";
import { MFDIView } from "src/ui/view/MFDIView";

export interface ViewSyncHandlers {
  /** 投稿送信 */
  handleSubmit: () => Promise<void>;
  /** デイリーノートを開く */
  handleClickOpenDailyNote: () => Promise<void>;
  /** granularity 変更 */
  setGranularity: (g: Granularity) => void;
  setTimeFilter: (t: TimeFilter) => void;
  setDateFilter: (d: DateFilter) => void;
  setCurrentDailyNote: (note: null) => void;
  setPosts: (posts: Post[]) => void;
  setTasks: (tasks: Task[]) => void;
  /** topic 変更 */
  setActiveTopic: (id: string) => void;
  /** asTask 変更 */
  setAsTask: (t: boolean) => void;
  /** modal editor */
  input: string;
  setInput: (s: string) => void;
  inputRef: React.RefObject<ObsidianLiveEditorRef | null>;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  setDisplayMode: (m: DisplayMode) => void;
}

/**
 * ReactView の state/handler を Obsidian View オブジェクトに同期する。
 *
 * View 側から paneMenu や keyboard shortcut でコールバックを呼び出せるよう、
 * `view.onXxx` / `view.xxx` に最新の関数・値を設定する。
 */
export function useViewSync(
  view: MFDIView,
  granularity: Granularity,
  activeTopic: string,
  asTask: boolean,
  timeFilter: TimeFilter,
  dateFilter: DateFilter,
  displayMode: DisplayMode,
  isReadOnly: boolean,
  {
    handleSubmit,
    handleClickOpenDailyNote,
    setGranularity,
    setTimeFilter,
    setDateFilter,
    setCurrentDailyNote,
    setPosts,
    setTasks,
    setActiveTopic,
    setAsTask,
    input,
    setInput,
    inputRef,
    sidebarOpen,
    setSidebarOpen,
    setDisplayMode,
  }: ViewSyncHandlers,
) {
  const { app } = useAppContext();
  const inputRefVal = useRef(input);
  const inputRefObj = useRef(inputRef);
  const sidebarOpenRef = useRef(sidebarOpen);
  const setSidebarOpenRef = useRef(setSidebarOpen);

  useEffect(() => {
    sidebarOpenRef.current = sidebarOpen;
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpenRef.current = setSidebarOpen;
  }, [setSidebarOpen]);

  useEffect(() => {
    inputRefVal.current = input;
  }, [input]);

  useEffect(() => {
    inputRefObj.current = inputRef;
  }, [inputRef]);
  // ── 値の同期（read-only な参照） ──────────────────────────────
  useEffect(() => {
    view.state.granularity = granularity;
  }, [view, granularity]);

  useEffect(() => {
    view.state.asTask = asTask;
  }, [view, asTask]);

  useEffect(() => {
    view.state.timeFilter = timeFilter;
  }, [view, timeFilter]);

  useEffect(() => {
    view.state.dateFilter = dateFilter;
  }, [view, dateFilter]);

  useEffect(() => {
    view.state.displayMode = displayMode;
  }, [view, displayMode]);

  useEffect(() => {
    view.state.activeTopic = activeTopic;
  }, [view, activeTopic]);

  // ── ハンドラの同期 ─────────────────────────────────────────────
  useEffect(() => {
    view.handlers.onSubmit = handleSubmit;
    return () => {
      view.handlers.onSubmit = undefined;
    };
  }, [view, handleSubmit]);

  useEffect(() => {
    view.handlers.onOpenDailyNoteAction = handleClickOpenDailyNote;
    return () => {
      view.handlers.onOpenDailyNoteAction = undefined;
    };
  }, [view, handleClickOpenDailyNote]);

  useEffect(() => {
    view.handlers.onChangeGranularity = (g: Granularity) => {
      setGranularity(g);
      if (g !== "day") {
        setTimeFilter("all");
        setDateFilter("today");
      }
      setCurrentDailyNote(null);
      setPosts([]);
      setTasks([]);
    };
    return () => {
      view.handlers.onChangeGranularity = undefined;
    };
  }, [
    view,
    setGranularity,
    setTimeFilter,
    setDateFilter,
    setCurrentDailyNote,
    setPosts,
    setTasks,
  ]);

  useEffect(() => {
    // setActiveTopic is actually handleChangeTopic
    view.handlers.onChangeTopic = setActiveTopic;
    return () => {
      view.handlers.onChangeTopic = undefined;
    };
  }, [view, setActiveTopic]);

  useEffect(() => {
    view.handlers.onChangeAsTask = (t: boolean) => {
      setAsTask(t);
    };
    return () => {
      view.handlers.onChangeAsTask = undefined;
    };
  }, [view, setAsTask]);

  useEffect(() => {
    view.handlers.onChangeTimeFilter = (t: TimeFilter) => {
      setTimeFilter(t);
    };
    return () => {
      view.handlers.onChangeTimeFilter = undefined;
    };
  }, [view, setTimeFilter]);

  useEffect(() => {
    view.handlers.onChangeDateFilter = (d: DateFilter) => {
      setDateFilter(d);
    };
    return () => {
      view.handlers.onChangeDateFilter = undefined;
    };
  }, [view, setDateFilter]);

  useEffect(() => {
    view.handlers.onChangeDisplayMode = (m: DisplayMode) => {
      setDisplayMode(m);
    };
    return () => {
      view.handlers.onChangeDisplayMode = undefined;
    };
  }, [view, setDisplayMode]);

  useEffect(() => {
    if (isReadOnly) {
      view.handlers.onOpenModalEditor = undefined;
      return;
    }

    view.handlers.onOpenModalEditor = () => {
      const modal = new MFDIModal(app, {
        initialContent: inputRefVal.current,
        onChange: (content) => {
          setInput(content);
          setTimeout(() => {
            inputRefObj.current.current?.setContent(content);
          });
        },
        onClose: (content) => {
          setInput(content);
          setTimeout(() => {
            inputRefObj.current.current?.setContent(content);
          });
        },
      });
      modal.open();
    };
    return () => {
      view.handlers.onOpenModalEditor = undefined;
    };
  }, [view, app, setInput, isReadOnly]);

  useEffect(() => {
    view.handlers.onToggleSidebar = () => {
      setSidebarOpenRef.current(!sidebarOpenRef.current);
    };
    return () => {
      view.handlers.onToggleSidebar = undefined;
    };
  }, [view]);
}
