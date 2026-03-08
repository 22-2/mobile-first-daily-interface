import * as React from "react";
import { createContext, useContext, ReactNode, useEffect } from "react";
import { useAppContext } from "./AppContext";
import { useMFDIApp } from "../hooks/useMFDIApp";
import { useViewSync } from "../hooks/useViewSync";

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

export const MFDIAppProvider: React.FC<MFDIAppProviderProps> = ({ children }) => {
  const { view } = useAppContext();
  const value = useMFDIApp();

  const {
    granularity,
    activeTopic,
    asTask,
    timeFilter,
    handleSubmit,
    handleClickOpenDailyNote,
    setGranularity,
    setTimeFilter,
    setCurrentDailyNote,
    setPosts,
    setTasks,
    setActiveTopic,
    setAsTask,
    input,
    setInput,
    inputRef,
    scrollContainerRef,
    currentDailyNote,
  } = value;

  // Sync state/handlers with Obsidian View
  useViewSync(view, granularity, activeTopic, asTask, timeFilter, {
    handleSubmit,
    handleClickOpenDailyNote,
    setGranularity,
    setTimeFilter,
    setCurrentDailyNote,
    setPosts,
    setTasks,
    setActiveTopic,
    setAsTask,
    input,
    setInput,
  });

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
    <MFDIAppContext.Provider value={value}>
      {children}
    </MFDIAppContext.Provider>
  );
};

