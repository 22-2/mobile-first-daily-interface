import { Notice, TFile } from "obsidian";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { granularityConfig } from "src/ui/config/granularity-config";
import { useAppContext } from "src/ui/context/AppContext";
import { useMFDIEditor } from "src/ui/hooks/internal/useMFDIEditor";
import { useMFDISettings } from "src/ui/hooks/internal/useMFDISettings";
import { useNoteSync } from "src/ui/hooks/useNoteSync";
import { usePostsAndTasks } from "src/ui/hooks/usePostsAndTasks";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useTaskActions } from "src/ui/hooks/internal/useTaskActions";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useNoteManager } from "src/ui/hooks/internal/useNoteManager";
import { useInfiniteTimeline } from "src/ui/hooks/internal/useInfiniteTimeline";
import { useWeekNotePaths } from "src/ui/hooks/internal/useWeekNotePaths";
import { useMultiDaySync } from "src/ui/hooks/internal/useMultiDaySync";
import { useSettingsStore, settingsStore } from "src/ui/store/settingsStore";
import { usePostsStore, postsStore } from "src/ui/store/postsStore";
import { useNoteStore, noteStore } from "src/ui/store/noteStore";
import { useEditorStore, editorStore } from "src/ui/store/editorStore";
import { getTopicNote } from "src/utils/daily-notes";

interface UseMFDIAppOptions {}

/**
 * Mobile First Daily Interface アプリ全体のロジックを統合管理するメインHook。
 * データの取得、更新、設定、編集状態のオーケストレーションを行います。
 */
export function useMFDIApp(_options?: UseMFDIAppOptions) {
  const { date, granularity, activeTopic, dateFilter, asTask, isReadOnly, displayMode } = useMFDISettings();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const postsState = usePostsAndTasks({ date });

  const {
    currentDailyNote,
    handleClickOpenDailyNote,
    handleChangeTopic,
  } = useNoteManager();

  const {
    input,
    setInput,
    inputRef,
  } = useMFDIEditor({ posts: postsState.posts });

  const {
    handleSubmit,
  } = usePostActions(scrollContainerRef);

  // ビュー状態変更時のオートフォーカス
  useEffect(() => {
    if (!isReadOnly && inputRef.current) {
      setTimeout(() => inputRef.current?.focus());
    }
  }, [date, granularity, activeTopic, dateFilter, asTask, isReadOnly, inputRef]);

  useEffect(() => {
    if (!currentDailyNote) return;
    const promises: Promise<void>[] = [postsState.updateTasks(currentDailyNote)];
    if (dateFilter === "today") {
      promises.push(postsState.updatePosts(currentDailyNote));
    }
    Promise.all(promises);
  }, [currentDailyNote, postsState.updateTasks, postsState.updatePosts, dateFilter]);

  useMultiDaySync();
  useNoteSync();

  return {
    scrollContainerRef,
    // Necessary for useViewSync in Provider
    granularity,
    activeTopic,
    asTask,
    timeFilter: settingsStore.getState().timeFilter,
    dateFilter,
    displayMode,
    isReadOnly,
    handleSubmit,
    handleClickOpenDailyNote,
    setGranularity: (v: any) => settingsStore.getState().setGranularity(v),
    setTimeFilter: (v: any) => settingsStore.getState().setTimeFilter(v),
    setDateFilter: (v: any) => settingsStore.getState().setDateFilter(v),
    setCurrentDailyNote: (note: TFile | null) => noteStore.getState().setCurrentDailyNote(note),
    setPosts: postsStore.getState().setPosts,
    setTasks: postsStore.getState().setTasks,
    setActiveTopic: settingsStore.getState().setActiveTopic,
    setAsTask: settingsStore.getState().setAsTask,
    input,
    setInput: editorStore.getState().setInput,
    inputRef,
    sidebarOpen: settingsStore.getState().sidebarOpen,
    setSidebarOpen: settingsStore.getState().setSidebarOpen,
    setDisplayMode: settingsStore.getState().setDisplayMode,
    currentDailyNote,
  };
}
