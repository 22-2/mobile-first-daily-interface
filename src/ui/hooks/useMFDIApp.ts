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
    setActiveTopic,
    granularity,
    setGranularity,
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

  const {
    posts,
    tasks,
    setPosts,
    setTasks,
    updatePosts,
    updateTasks,
    updatePostsForWeek,
    updatePostsForDays,
    getPostsForDays,
  } = usePostsAndTasks({ date, granularity });

  const {
    currentDailyNote,
    setCurrentDailyNote,
    updateCurrentDailyNote,
    createNoteWithInsertAfter,
    handleClickOpenDailyNote,
    handleChangeTopic,
  } = useNoteManager({
    app,
    settings,
    date,
    setDate,
    granularity,
    activeTopic,
    setActiveTopic,
    setPosts,
    setTasks,
  });

  const { weekNotePaths, replacePaths, addPaths } = useWeekNotePaths();

  const {
    input,
    setInput,
    editingPost,
    editingPostOffset,
    inputRef,
    canSubmit,
    startEdit,
    cancelEdit,
  } = useMFDIEditor({ posts, date, granularity, asTask, setAsTask });


  const {
    handleSubmit,
    deletePost,
    movePostToTomorrow,
    handleClickTime,
  } = usePostActions({
    appHelper,
    settings,
    date,
    granularity,
    activeTopic,
    dateFilter,
    currentDailyNote,
    posts,
    input,
    asTask,
    editingPost,
    canSubmit,
    inputRef,
    isReadOnly,
    setInput,
    setDate,
    cancelEdit,
    updatePosts,
    updatePostsForWeek,
    updatePostsForDays,
    replacePaths,
    createNoteWithInsertAfter,
    scrollContainerRef,
  });

  const {
    updateTaskChecked,
    openTaskInEditor,
    deleteTask,
  } = useTaskActions({
    appHelper,
    currentDailyNote,
    tasks,
    setTasks,
    isReadOnly,
  });

  const { loadMore, hasMore } = useInfiniteTimeline({
    activeTopic,
    displayMode,
    date,
    getPostsForDays,
    setPosts,
    addPaths,
  });


  // ビュー状態変更時のオートフォーカス
  useEffect(() => {
    if (!isReadOnly && inputRef.current) {
      setTimeout(() => inputRef.current?.focus());
    }
  }, [date, granularity, activeTopic, dateFilter, asTask, isReadOnly, inputRef]);

  useEffect(() => {
    if (!currentDailyNote) return;
    const promises: Promise<void>[] = [updateTasks(currentDailyNote)];
    if (dateFilter === "today") {
      promises.push(updatePosts(currentDailyNote));
    }
    Promise.all(promises);
  }, [currentDailyNote, updatePosts, updateTasks, dateFilter]);

  useMultiDaySync({
    date,
    dateFilter,
    granularity,
    asTask,
    activeTopic,
    updatePostsForWeek,
    updatePostsForDays,
    replacePaths,
  });

  useNoteSync({
    date,
    granularity,
    topicId: activeTopic,
    currentDailyNote,
    weekNotePaths:
      dateFilter !== "today" ? weekNotePaths : undefined,
    setDate,
    setTasks,
    setPosts,
    updateCurrentDailyNote,
    updatePosts,
    updateTasks,
    onWeekNoteChanged:
      dateFilter !== "today"
        ? () => {
            if (dateFilter === "this_week") {
              updatePostsForWeek(activeTopic).then((paths) => {
                replacePaths(paths);
              });
            } else {
              const days = parseInt(dateFilter);
              if (!isNaN(days)) {
                updatePostsForDays(activeTopic, days).then(({ paths }) => {
                  replacePaths(paths);
                });
              }
            }
          }
        : undefined,
  });


  const filteredPosts = useFilteredPosts({
    posts,
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
    setGranularity,
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
    posts,
    setPosts,
    loadMore,
    hasMore,
    filteredPosts,
    tasks,
    setTasks,
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
