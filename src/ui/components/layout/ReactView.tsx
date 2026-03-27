import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { App } from "obsidian";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Settings } from "src/settings";
import { MiniCalendar } from "src/ui/components/calendar/MiniCalendar";
import { EmptyState } from "src/ui/components/EmptyState";
import { InputArea } from "src/ui/components/InputArea";
import { SidebarScales } from "src/ui/components/layout/SidebarScales";
import { TagList } from "src/ui/components/layout/TagList";
import { PostListView } from "src/ui/components/posts/PostListView";
import { Box, Flex } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import { StatusBar } from "src/ui/components/statusbar/StatusBar";
import { TaskListView } from "src/ui/components/tasks/TaskListView";
import { AppContextProvider, useAppContext } from "src/ui/context/AppContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useNoteSync } from "src/ui/hooks/useNoteSync";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import type { AppStoreApi } from "src/ui/store/appStore";
import {
  AppStoreProvider,
  createAppStore,
  initializeAppStore,
  useCurrentAppStore,
} from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type {
  DateFilter,
  DisplayMode,
  Granularity,
  Post,
  TimeFilter,
} from "src/ui/types";
import { isTimelineView } from "src/ui/utils/view-mode";
import type { MFDIView } from "src/ui/view/MFDIView";
import {
  createDefaultMFDIViewState,
  getMFDIViewCapabilities,
} from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

const queryClient = new QueryClient();

export const ReactView = ({
  app,
  settings,
  view,
}: {
  app: App;
  settings: Settings;
  view: MFDIView;
}) => {
  const storeRef = useRef<AppStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createAppStore();
  }

  return (
    <AppContextProvider app={app} settings={settings} view={view}>
      <AppStoreProvider store={storeRef.current}>
        <QueryClientProvider client={queryClient}>
          <MFDIAppRoot>
            <ReactViewContent />
          </MFDIAppRoot>
        </QueryClientProvider>
      </AppStoreProvider>
    </AppContextProvider>
  );
};

const MFDIAppRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { view, settings, storage, shell } = useAppContext();
  const store = useCurrentAppStore();
  const viewState = view.getState();
  const capabilities = useMemo(
    () => getMFDIViewCapabilities(viewState),
    [view, viewState.noteMode],
  );

  useEffect(() => {
    initializeAppStore({ shell, settings, storage }, store);
  }, [settings, storage, shell, store]);

  const { date, granularity, activeTopic, dateFilter, asTask, isReadOnly } =
    useSettingsStore(
      useShallow((state) => ({
        date: state.date,
        granularity: state.granularity,
        activeTopic: state.activeTopic,
        dateFilter: state.dateFilter,
        asTask: state.asTask,
        isReadOnly: state.isReadOnly(),
      })),
    );

  const { currentDailyNote, replacePaths } = useNoteStore(
    useShallow((state) => ({
      currentDailyNote: state.currentDailyNote,
      replacePaths: state.replacePaths,
    })),
  );

  const {
    posts,
    updatePosts,
    updateTasks,
    updatePostsForWeek,
    updatePostsForDays,
    updatePostsFromDB,
  } = usePostsStore(
    useShallow((state) => ({
      posts: state.posts,
      updatePosts: state.updatePosts,
      updateTasks: state.updateTasks,
      updatePostsForWeek: state.updatePostsForWeek,
      updatePostsForDays: state.updatePostsForDays,
      updatePostsFromDB: state.updatePostsFromDB,
    })),
  );

  const { displayMode } = useSettingsStore(
    useShallow((state) => ({
      displayMode: state.displayMode,
    })),
  );

  const { inputRef, scrollContainerRef } = useEditorStore(
    useShallow((state) => ({
      inputRef: state.inputRef,
      scrollContainerRef: state.scrollContainerRef,
    })),
  );

  useNoteSync();

  useEffect(() => {
    store.getState().setViewContext({
      noteMode: viewState.noteMode,
      fixedNotePath: viewState.fixedNotePath,
    });

    // fixedビューでは periodic 側の永続状態を引き継がない
    if (viewState.noteMode === "fixed") {
      const fixedDefaults = createDefaultMFDIViewState({
        noteMode: "fixed",
        fixedNotePath: viewState.fixedNotePath,
      });

      store.setState({
        displayMode: fixedDefaults.displayMode,
        granularity: fixedDefaults.granularity,
        dateFilter: fixedDefaults.dateFilter,
        timeFilter: fixedDefaults.timeFilter,
        asTask: fixedDefaults.asTask,
        // fixedノートではタグ絞り込みを許すと periodic 側の状態が見え方に混入する。
        activeTag: null,
        threadFocusRootId: null,
      });
    }
  }, [store, view, viewState.noteMode, viewState.fixedNotePath]);

  useEffect(() => {
    store.getState().updateCurrentDailyNote(shell);
  }, [
    store,
    shell,
    date,
    granularity,
    activeTopic,
    viewState.noteMode,
    viewState.fixedNotePath,
  ]);

  useEffect(() => {
    if (viewState.noteMode === "fixed") return;
    if (!capabilities.supportsPeriodMenus) return;
    if (granularity !== "day" || asTask) return;

    if (dateFilter === "this_week") {
      updatePostsForWeek(activeTopic, date).then((paths) => {
        replacePaths(paths);
      });
      return;
    }

    if (["3d", "5d", "7d"].includes(dateFilter)) {
      const days = parseInt(dateFilter, 10);
      if (!Number.isNaN(days)) {
        updatePostsForDays(activeTopic, date, days).then(({ paths }) => {
          replacePaths(paths);
        });
      }
    }
  }, [
    date,
    dateFilter,
    granularity,
    asTask,
    activeTopic,
    replacePaths,
    updatePostsForWeek,
    updatePostsForDays,
    capabilities.supportsPeriodMenus,
    viewState.noteMode,
  ]);

  useEffect(() => {
    if (!isReadOnly && inputRef.current) {
      setTimeout(() => inputRef.current?.focus());
    }
  }, [
    date,
    granularity,
    activeTopic,
    dateFilter,
    asTask,
    isReadOnly,
    inputRef,
  ]);

  useEffect(() => {
    if (!currentDailyNote) return;

    const promises: Promise<void>[] = [updateTasks(currentDailyNote)];
    if (viewState.noteMode === "fixed" || dateFilter === "today") {
      promises.push(updatePosts(currentDailyNote));
    }
    Promise.all(promises);
  }, [
    currentDailyNote,
    dateFilter,
    updatePosts,
    updateTasks,
    viewState.noteMode,
  ]);

  // Sync state/handlers with Obsidian View
  useViewSync(view);

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

  return <>{children}</>;
};

const ReactViewContent = () => {
  const { view } = useAppContext();
  const viewState = view.getState();
  const capabilities = useMemo(
    () => getMFDIViewCapabilities(viewState),
    [view, viewState.noteMode],
  );
  const settings = useSettingsStore(
    useShallow((s) => ({
      activeTag: s.activeTag,
      granularity: s.granularity,
      asTask: s.asTask,
      dateFilter: s.dateFilter,
      sidebarOpen: s.sidebarOpen,
      setSidebarOpen: s.setSidebarOpen,
      timeFilter: s.timeFilter,
      displayMode: s.displayMode,
      threadFocusRootId: s.threadFocusRootId,
    })),
  );

  const { tasks, posts } = usePostsStore(
    useShallow((s) => ({
      tasks: s.tasks,
      posts: s.posts,
    })),
  );

  const { currentDailyNote } = useNoteStore(
    useShallow((s) => ({
      currentDailyNote: s.currentDailyNote,
    })),
  );

  const { scrollContainerRef } = useEditorStore(
    useShallow((s) => ({
      scrollContainerRef: s.scrollContainerRef,
    })),
  );

  const filteredPosts = useFilteredPosts({
    posts,
    ...settings,
  });

  // スレッド内表示時は返信も含めて全メッセージをコピーするためのフィルタ
  const filteredPostsWithThreadReplies = useFilteredPosts({
    posts,
    ...settings,
    includeThreadReplies: true,
  });

  useEffect(() => {
    view.handlers.onCopyAllPosts = () => {
      // スレッド表示中は返信も含めて全メッセージをコピー
      const postsTocopy: Post[] =
        settings.threadFocusRootId && settings.displayMode === "focus"
          ? filteredPostsWithThreadReplies.toReversed()
          : filteredPosts;
      const text = postsTocopy
        .map((p) => `${p.timestamp.format("YYYY-MM-DD HH:mm")}\n${p.message}`)
        .join("\n\n");
      navigator.clipboard.writeText(text);
    };
    return () => {
      view.handlers.onCopyAllPosts = undefined;
    };
  }, [
    view,
    filteredPosts,
    filteredPostsWithThreadReplies,
    settings.threadFocusRootId,
    settings.displayMode,
  ]);

  const { granularity, asTask, dateFilter, sidebarOpen, setSidebarOpen } =
    settings;

  const [containerWidth, setContainerWidth] = useState(1000);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWidthRef = useRef(containerWidth);

  const [sideBarViewDate, setSideBarViewDate] = useState(() => window.moment());

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const newWidth = entries[0].contentRect.width;
        // 1100px を跨いで狭くなった瞬間に一度だけ自動で閉じる（手動での再開は妨げない）
        if (newWidth <= 1100 && lastWidthRef.current > 1100) {
          setSidebarOpen(false);
        }
        // 1400px を跨いで広くなった瞬間に自動で開く
        if (newWidth > 1400 && lastWidthRef.current <= 1400) {
          setSidebarOpen(true);
        }
        setContainerWidth(newWidth);
        lastWidthRef.current = newWidth;
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [setSidebarOpen]);

  const effectivelyOpen = sidebarOpen && capabilities.supportsSidebar;

  const isEmpty =
    !isTimelineView(settings.displayMode) &&
    ((dateFilter === "today" && !currentDailyNote) ||
      (asTask ? tasks.length === 0 : filteredPosts.length === 0));

  return (
    <Flex
      className="root h-full w-full overflow-hidden relative"
      ref={containerRef}
    >
      {/* Main Content */}
      <Flex
        className={cn(
          "flex-col h-full relative flex-grow ml-[var(--size-4-2)] overflow-hidden",
          !effectivelyOpen && "mr-[var(--size-4-2)]",
        )}
      >
        <InputArea />
        <StatusBar />

        <Flex
          className="mfdi-scroll-container flex-col flex-grow overflow-y-scroll overflow-x-hidden"
          ref={scrollContainerRef}
        >
          {isEmpty ? (
            <EmptyState granularity={granularity} />
          ) : asTask ? (
            <TaskListView />
          ) : (
            <PostListView />
          )}
        </Flex>
      </Flex>

      {/* Sidebar: MiniCalendar (Moved to Right) */}
      {capabilities.supportsSidebar && (
        <Box
          className={`${effectivelyOpen ? "flex w-[260px] min-w-[260px] ml-[var(--size-4-2)]" : "hidden w-0 min-w-0"} h-full flex-col py-[var(--size-4-2)] px-0 mr-[var(--size-4-2)] transition-all duration-200 overflow-hidden`}
        >
          <MiniCalendar onViewDateChange={setSideBarViewDate} />
          <SidebarScales viewedDate={sideBarViewDate} />
          <TagList />
        </Box>
      )}
    </Flex>
  );
};

function useViewSync(view: MFDIView) {
  const { shell, settings } = useAppContext();
  const { openDraftList, openModalEditor } = useObsidianUi();
  const store = useCurrentAppStore();

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
    useShallow((state) => ({
      granularity: state.granularity,
      activeTopic: state.activeTopic,
      asTask: state.asTask,
      timeFilter: state.timeFilter,
      dateFilter: state.dateFilter,
      displayMode: state.displayMode,
      isReadOnly: state.isReadOnly(),
      sidebarOpen: state.sidebarOpen,
      setGranularity: state.setGranularity,
      setTimeFilter: state.setTimeFilter,
      setDateFilter: state.setDateFilter,
      setActiveTopic: state.setActiveTopic,
      setAsTask: state.setAsTask,
      setDisplayMode: state.setDisplayMode,
      setSidebarOpen: state.setSidebarOpen,
    })),
  );

  const { inputSnapshot, getInputValue, replaceInput, syncInputSession } =
    useEditorStore(
      useShallow((state) => ({
        inputSnapshot: state.inputSnapshot,
        getInputValue: state.getInputValue,
        replaceInput: state.replaceInput,
        syncInputSession: state.syncInputSession,
      })),
    );

  const { handleSubmit } = usePostActions();
  const handleClickOpenDailyNote = useCallback(() => {
    return store.getState().handleClickOpenDailyNote(shell, settings);
  }, [store, shell, settings]);

  const { setCurrentDailyNote, setPosts, setTasks } = store.getState();

  const inputRefVal = useRef(inputSnapshot);
  const sidebarOpenRef = useRef(sidebarOpen);
  const setSidebarOpenRef = useRef(setSidebarOpen);

  useEffect(() => {
    sidebarOpenRef.current = sidebarOpen;
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpenRef.current = setSidebarOpen;
  }, [setSidebarOpen]);

  useEffect(() => {
    inputRefVal.current = inputSnapshot;
  }, [inputSnapshot]);

  useEffect(() => {
    view.setStatePartial({ granularity });
  }, [view, granularity]);

  useEffect(() => {
    view.setStatePartial({ asTask });
  }, [view, asTask]);

  useEffect(() => {
    view.setStatePartial({ timeFilter });
  }, [view, timeFilter]);

  useEffect(() => {
    view.setStatePartial({ dateFilter });
  }, [view, dateFilter]);

  useEffect(() => {
    view.setStatePartial({ displayMode });
  }, [view, displayMode]);

  useEffect(() => {
    view.setStatePartial({ activeTopic });
  }, [view, activeTopic]);

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
    view.handlers.onChangeGranularity = (nextGranularity: Granularity) => {
      setGranularity(nextGranularity);
      if (nextGranularity !== "day") {
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
    view.handlers.onChangeTopic = setActiveTopic;
    return () => {
      view.handlers.onChangeTopic = undefined;
    };
  }, [view, setActiveTopic]);

  useEffect(() => {
    view.handlers.onChangeAsTask = (nextAsTask: boolean) => {
      setAsTask(nextAsTask);
    };
    return () => {
      view.handlers.onChangeAsTask = undefined;
    };
  }, [view, setAsTask]);

  useEffect(() => {
    view.handlers.onChangeTimeFilter = (nextTimeFilter: TimeFilter) => {
      setTimeFilter(nextTimeFilter);
    };
    return () => {
      view.handlers.onChangeTimeFilter = undefined;
    };
  }, [view, setTimeFilter]);

  useEffect(() => {
    view.handlers.onChangeDateFilter = (nextDateFilter: DateFilter) => {
      setDateFilter(nextDateFilter);
    };
    return () => {
      view.handlers.onChangeDateFilter = undefined;
    };
  }, [view, setDateFilter]);

  useEffect(() => {
    view.handlers.onChangeDisplayMode = (nextDisplayMode: DisplayMode) => {
      setDisplayMode(nextDisplayMode);
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
      openModalEditor({
        initialContent: getInputValue() || inputRefVal.current,
        onChange: (content) => {
          replaceInput(content);
        },
        onClose: (content) => {
          replaceInput(content);
        },
      });
    };
    return () => {
      view.handlers.onOpenModalEditor = undefined;
    };
  }, [view, openModalEditor, getInputValue, replaceInput, isReadOnly]);

  useEffect(() => {
    view.handlers.onToggleSidebar = () => {
      setSidebarOpenRef.current(!sidebarOpenRef.current);
    };
    return () => {
      view.handlers.onToggleSidebar = undefined;
    };
  }, [view]);

  useEffect(() => {
    view.handlers.onOpenDraftList = () => {
      openDraftList();
    };
    return () => {
      view.handlers.onOpenDraftList = undefined;
    };
  }, [view, openDraftList, store]);

  useEffect(() => {
    view.handlers.onSetLiveEditorContentForTesting = (content: string) => {
      syncInputSession(content);
    };
    view.handlers.onGetLiveEditorContentForTesting = () => {
      return getInputValue();
    };

    return () => {
      view.handlers.onSetLiveEditorContentForTesting = undefined;
      view.handlers.onGetLiveEditorContentForTesting = undefined;
    };
  }, [view, syncInputSession, getInputValue]);
}
