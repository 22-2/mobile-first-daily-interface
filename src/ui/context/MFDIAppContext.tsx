import * as React from "react";
import { createContext, ReactNode, useContext, useEffect } from "react";
import { useAppContext } from "src/ui/context/AppContext";
import { useMFDIApp } from "src/ui/hooks/useMFDIApp";
import { useViewSync } from "src/ui/hooks/useViewSync";
import { initializeSettingsStore } from "src/ui/store/settingsStore";
import { initializeEditorStore } from "src/ui/store/editorStore";
import { initializePostsStore } from "src/ui/store/postsStore";

type MFDIAppContextValue = ReturnType<typeof useMFDIApp>;

const MFDIAppContext = createContext<MFDIAppContextValue | null>(null);

export const useMFDIContext = () => {
  const context = useContext(MFDIAppContext);
  if (!context) {
    throw new Error("useMFDIContext must be used within MFDIAppProvider");
  }
  return context;
};

interface MFDIAppProviderProps {
  children: ReactNode;
}

export const MFDIAppProvider: React.FC<MFDIAppProviderProps> = ({
  children,
}) => {
  const { view, settings, storage, app, appHelper } = useAppContext();

  // Initialize store once
  React.useMemo(() => {
    initializeSettingsStore(settings, storage);
    initializeEditorStore(storage);
    initializePostsStore(app, appHelper);
  }, [settings, storage, app, appHelper]);

  const value = useMFDIApp();

  const {
    granularity,
    activeTopic,
    asTask,
    timeFilter,
    dateFilter,
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
    displayMode,
    setDisplayMode,
    scrollContainerRef,
    currentDailyNote,
    isReadOnly,
  } = value;

  // Sync state/handlers with Obsidian View
  useViewSync(
    view,
    granularity,
    activeTopic,
    asTask,
    timeFilter,
    dateFilter,
    displayMode,
    isReadOnly,
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
    },
  );

  // Handle focus requested from View
  useEffect(() => {
    view.handlers.onFocusRequested = () => {
      inputRef.current?.focus();
    };
    return () => {
      view.handlers.onFocusRequested = undefined;
    };
  }, [view, inputRef]);

  // Initial scroll position when note changes
  useEffect(() => {
    if (!currentDailyNote || !scrollContainerRef.current) return;
    const timer = setTimeout(() => {
      scrollContainerRef.current?.scrollTo({ top: 0 });
    }, 0);
    return () => clearTimeout(timer);
  }, [currentDailyNote, scrollContainerRef]);

  return (
    <MFDIAppContext.Provider value={value}>{children}</MFDIAppContext.Provider>
  );
};
