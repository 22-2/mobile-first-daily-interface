import { useInfiniteQuery } from "@tanstack/react-query";
import { Notice, TFile } from "obsidian";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { granularityConfig } from "src/ui/config/granularity-config";
import { useAppContext } from "src/ui/context/AppContext";
import { useMFDIEditor } from "src/ui/hooks/internal/useMFDIEditor";
import { useMFDISettings } from "src/ui/hooks/internal/useMFDISettings";
import { useNoteSync } from "src/ui/hooks/useNoteSync";
import { usePostsAndTasks } from "src/ui/hooks/usePostsAndTasks";
import { MomentLike, Post } from "src/ui/types";
import { createTopicNote, getTopicNote } from "src/utils/daily-notes";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useTaskActions } from "src/ui/hooks/internal/useTaskActions";

import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";

interface UseMFDIAppOptions {}

/**
 * Mobile First Daily Interface アプリ全体のロジックを統合管理するメインHook。
 * データの取得、更新、設定、編集状態のオーケストレーションを行います。
 */
export function useMFDIApp(_options?: UseMFDIAppOptions) {
  const { app, appHelper, settings } = useAppContext();

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
    handleChangeCalendarDate,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
    getMoveStep,
  } = useMFDISettings();

  const [currentDailyNote, setCurrentDailyNote] = useState<TFile | null>(null);
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

  // 複数日モード中に監視するファイルパス集合
  const [weekNotePaths, setWeekNotePaths] = useState<Set<string>>(new Set());

  const {
    input,
    setInput,
    asTask,
    setAsTask,
    editingPost,
    editingPostOffset,
    inputRef,
    canSubmit,
    startEdit,
    cancelEdit,
  } = useMFDIEditor({ posts, date, granularity });

  const isReadOnly = useMemo(() => {
    return date.isBefore(window.moment(), granularityConfig[granularity].unit);
  }, [date, granularity]);

  const createNoteWithInsertAfter = useCallback(async (targetDate?: MomentLike) => {
    const d = targetDate ?? date;
    const created = await createTopicNote(app, d, granularity, activeTopic);
    if (created && settings.insertAfter) {
      const content = await app.vault.read(created);
      if (!content.includes(settings.insertAfter)) {
        await app.vault.modify(
          created,
          content
            ? `${content}\n${settings.insertAfter}`
            : settings.insertAfter,
        );
      }
    }
    return created;
  }, [app, date, granularity, activeTopic, settings.insertAfter]);

  const {
    handleSubmit,
    deletePost,
    movePostToTomorrow,
    handleClickTime,
  } = usePostActions({
    app,
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
    setWeekNotePaths,
    createNoteWithInsertAfter,
    scrollContainerRef,
  });

  const {
    updateTaskChecked,
    openTaskInEditor,
    deleteTask,
  } = useTaskActions({
    app,
    appHelper,
    currentDailyNote,
    tasks,
    setTasks,
    isReadOnly,
  });

  const handleClickHome = useCallback(() => {
    setDisplayMode("focus");
    setGranularity("day");
    setDateFilter("today");
    setTimeFilter("all");
    setAsTask(false);
    setDate(window.moment());
  }, [setDisplayMode, setGranularity, setDateFilter, setTimeFilter, setAsTask, setDate]);

  const isToday = useMemo(() => {
    return date.isSame(window.moment(), granularityConfig[granularity].unit);
  }, [date, granularity]);

  const updateCurrentDailyNote = useCallback(() => {
    const n = getTopicNote(app, date, granularity, activeTopic);
    if (n?.path !== currentDailyNote?.path) {
      setCurrentDailyNote(n);
    }
  }, [app, date, granularity, activeTopic, currentDailyNote]);

  const handleChangeTopic = useCallback(
    (topicId: string) => {
      if (activeTopic === topicId) return;
      setActiveTopic(topicId);
      setCurrentDailyNote(null);
      setPosts([]);
      setTasks([]);
    },
    [activeTopic, setActiveTopic, setPosts, setTasks],
  );

  useEffect(() => {
    updateCurrentDailyNote();
  }, [date, granularity, activeTopic, updateCurrentDailyNote]);

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

  // 複数日モードのデータロード
  useEffect(() => {
    if (granularity !== "day" || asTask) return;
    if (dateFilter === "this_week") {
      updatePostsForWeek(activeTopic).then((paths) => {
        setWeekNotePaths(paths);
      });
    } else if (
      dateFilter === "3d" ||
      dateFilter === "5d" ||
      dateFilter === "7d"
    ) {
      const days = parseInt(dateFilter);
      if (!isNaN(days)) {
        updatePostsForDays(activeTopic, days).then(({ paths }) => {
          setWeekNotePaths(paths);
        });
      }
    }
  }, [
    date,
    dateFilter,
    granularity,
    asTask,
    activeTopic,
    updatePostsForWeek,
    updatePostsForDays,
  ]);

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = window.moment ? 
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useInfiniteQuery({
      queryKey: ["posts", activeTopic, displayMode],
      queryFn: async ({ pageParam }) => {
        const baseDate = pageParam ? window.moment(pageParam) : date.clone();
        const result = await getPostsForDays(activeTopic, baseDate, 14);
        
        // 監視対象パスを更新
        setWeekNotePaths((prev) => {
          const next = new Set(prev);
          result.paths.forEach((p) => next.add(p));
          return next;
        });
        
        return result;
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => {
        return lastPage.hasMore ? lastPage.lastSearchedDate.clone().subtract(1, "day").format() : undefined;
      },
      enabled: displayMode === "timeline",
    }) : { data: null, fetchNextPage: () => {}, hasNextPage: false, isFetchingNextPage: false };

  // TanStack Query の結果を posts に反映
  useEffect(() => {
    if (displayMode === "timeline" && infiniteData) {
      const allPosts = (infiniteData as any).pages.flatMap((p: any) => p.posts);
      setPosts(allPosts.sort((a: Post, b: Post) => b.timestamp.valueOf() - a.timestamp.valueOf()));
    }
  }, [displayMode, infiniteData, setPosts]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
                setWeekNotePaths(paths);
              });
            } else {
              const days = parseInt(dateFilter);
              if (!isNaN(days)) {
                updatePostsForDays(activeTopic, days).then(({ paths }) => {
                  setWeekNotePaths(paths);
                });
              }
            }
          }
        : undefined,
  });

  const handleClickOpenDailyNote = useCallback(async () => {
    if (!currentDailyNote) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      await createNoteWithInsertAfter();
      setDate(date.clone());
    }
    const note = getTopicNote(app, date, granularity, activeTopic);
    if (note) {
      await app.workspace.getLeaf(true).openFile(note);
    }
  }, [app, date, granularity, activeTopic, currentDailyNote, createNoteWithInsertAfter, setDate]);

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
    hasMore: hasNextPage,
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
