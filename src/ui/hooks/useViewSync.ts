import { useEffect, useRef } from "react";
import { useAppContext } from "src/ui/context/AppContext";
import { MFDIModal } from "src/ui/modals/MFDIModal";
import { DateFilter, DisplayMode, Granularity, TimeFilter } from "src/ui/types";
import { MFDIView } from "src/ui/view/MFDIView";

import { useNoteManager } from "src/ui/hooks/internal/useNoteManager";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { editorStore, useEditorStore } from "src/ui/store/editorStore";
import { noteStore } from "src/ui/store/noteStore";
import { postsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

/**
 * ReactView の state/handler を Obsidian View オブジェクトに同期する。
 */
export function useViewSync(view: MFDIView) {
  const { app } = useAppContext();

  const {
    granularity,
    activeTopic,
    asTask,
    timeFilter,
    dateFilter,
    displayMode,
    isReadOnly,
    sidebarOpen,
    setGranularity,
    setTimeFilter,
    setDateFilter,
    setActiveTopic,
    setAsTask,
    setDisplayMode,
    setSidebarOpen,
  } = useSettingsStore(
    useShallow((s) => ({
      granularity: s.granularity,
      activeTopic: s.activeTopic,
      asTask: s.asTask,
      timeFilter: s.timeFilter,
      dateFilter: s.dateFilter,
      displayMode: s.displayMode,
      isReadOnly: s.isReadOnly(),
      sidebarOpen: s.sidebarOpen,
      setGranularity: s.setGranularity,
      setTimeFilter: s.setTimeFilter,
      setDateFilter: s.setDateFilter,
      setActiveTopic: s.setActiveTopic,
      setAsTask: s.setAsTask,
      setDisplayMode: s.setDisplayMode,
      setSidebarOpen: s.setSidebarOpen,
    })),
  );

  const { input, inputRef } = useEditorStore(
    useShallow((s) => ({
      input: s.input,
      inputRef: s.inputRef,
    })),
  );
  const { setInput } = editorStore.getState();

  const { handleSubmit } = usePostActions();
  const { handleClickOpenDailyNote } = useNoteManager();

  const { setCurrentDailyNote } = noteStore.getState();
  const { setPosts, setTasks } = postsStore.getState();

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
