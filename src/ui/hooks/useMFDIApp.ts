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
import { getTopicNote } from "src/utils/daily-notes";

interface UseMFDIAppOptions {}

/**
 * Mobile First Daily Interface アプリ全体のロジックを統合管理するメインHook。
 * データの取得、更新、設定、編集状態のオーケストレーションを行います。
 */
export function useMFDIApp(_options?: UseMFDIAppOptions) {
  const { appHelper, settings } = useAppContext();
  const app = appHelper.getApp();

  const {
    activeTopic,
    granularity,
    date,
    setDate,
    timeFilter,
    setTimeFilter,
    dateFilter,
    setDateFilter,
    sidebarOpen,
    setSidebarOpen,
    displayMode,
    setDisplayMode,
    asTask,
    setAsTask,
    isToday,
    isReadOnly,
    handleClickHome,
    handleChangeCalendarDate,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
    getMoveStep,
  } = useMFDISettings();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const postsState = usePostsAndTasks({ date });

  const {
    currentDailyNote,
    setCurrentDailyNote,
    updateCurrentDailyNote,
    handleClickOpenDailyNote,
    handleChangeTopic,
  } = useNoteManager();

  const {
    input,
    setInput,
    editingPost,
    editingPostOffset,
    inputRef,
    canSubmit,
    startEdit,
    cancelEdit,
  } = useMFDIEditor({ posts: postsState.posts });


  const {
    handleSubmit,
    deletePost,
    movePostToTomorrow,
    handleClickTime,
  } = usePostActions(scrollContainerRef);

  const {
    updateTaskChecked,
    openTaskInEditor,
    deleteTask,
  } = useTaskActions();

  const { loadMore, hasMore } = useInfiniteTimeline();


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
  }, [currentDailyNote, postsState, dateFilter]);

  useMultiDaySync();
  useNoteSync();

  const filteredPosts = useFilteredPosts({
    posts: postsState.posts,
    timeFilter,
    dateFilter,
    asTask,
    granularity,
    displayMode,
  });

  return {
    activeTopic,
    setActiveTopic: handleChangeTopic,
    granularity,
    setGranularity: (v: any) => settingsStore.getState().setGranularity(v),
    date,
    setDate,
    currentDailyNote,
    setCurrentDailyNote,
    input,
    setInput,
    asTask,
    setAsTask,
    editingPost,
    editingPostOffset,
    timeFilter,
    setTimeFilter,
    dateFilter,
    setDateFilter,
    sidebarOpen,
    setSidebarOpen,
    displayMode,
    setDisplayMode,
    posts: postsState.posts,
    setPosts: postsState.setPosts,
    loadMore,
    hasMore,
    filteredPosts,
    tasks: postsState.tasks,
    setTasks: postsState.setTasks,
    canSubmit,
    inputRef,
    scrollContainerRef,
    handleChangeCalendarDate,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
    handleClickHome,
    handleClickOpenDailyNote,
    handleSubmit,
    startEdit,
    cancelEdit,
    deletePost,
    movePostToTomorrow,

    handleClickTime,
    updateTaskChecked,
    openTaskInEditor,
    deleteTask,
    isToday,
    isReadOnly,
    getMoveStep,
  };
}
