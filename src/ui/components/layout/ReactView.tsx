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
import { useObsidianComponent } from "src/ui/context/ComponentContext";
import { ComponentContextProvider } from "src/ui/context/ComponentContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useDbSync } from "src/ui/hooks/useDbSync";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useNoteSync } from "src/ui/hooks/useNoteSync";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import type { AppStoreApi } from "src/ui/store/appStore";
import {
  AppStoreProvider,
  createAppStore,
  initializeAppStore,
  useAppStore,
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
    <AppContextProvider app={app} settings={settings}>
      <ComponentContextProvider component={view}>
        <AppStoreProvider store={storeRef.current}>
          <QueryClientProvider client={queryClient}>
            <MFDIAppRoot>
              <ReactViewContent />
            </MFDIAppRoot>
          </QueryClientProvider>
        </AppStoreProvider>
      </ComponentContextProvider>
    </AppContextProvider>
  );
};

const MFDIAppRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, storage, shell } = useAppContext();
  const component = useObsidianComponent();
  const store = useCurrentAppStore();
  const { viewNoteMode, fixedNotePath } = useAppStore(
    useShallow((s) => ({
      viewNoteMode: s.viewNoteMode,
      fixedNotePath: s.fixedNotePath,
    })),
  );

  const capabilities = useMemo(
    () => getMFDIViewCapabilities({ noteMode: viewNoteMode }),
    [viewNoteMode],
  );

  useEffect(() => {
    initializeAppStore(
      {
        shell,
        settings,
        storage,
      },
      store,
    );
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
  useDbSync();

  useEffect(() => {
    if (!("getState" in component)) return;

    const viewState = (component as any).getState();
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
  }, [store, component, viewNoteMode, fixedNotePath]);

  useEffect(() => {
    store.getState().updateCurrentDailyNote(shell);
  }, [
    store,
    shell,
    date,
    granularity,
    activeTopic,
    viewNoteMode,
    fixedNotePath,
  ]);

  useEffect(() => {
    if (viewNoteMode === "fixed") return;
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
    viewNoteMode,
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
    if (viewNoteMode === "fixed" || dateFilter === "today") {
      promises.push(updatePosts(currentDailyNote));
    }
    Promise.all(promises);
  }, [
    currentDailyNote,
    dateFilter,
    updatePosts,
    updateTasks,
    viewNoteMode,
  ]);

  // Sync state/handlers with Obsidian View
  useViewSync("handlers" in component ? (component as any) : null);

  // Handle focus requested from View
  useEffect(() => {
    if (!("handlers" in component)) return;
    (component as any).handlers.onFocusRequested = () => {
      inputRef.current?.focus();
    };
    return () => {
      (component as any).handlers.onFocusRequested = undefined;
    };
  }, [component, inputRef]);

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
  const component = useObsidianComponent();
  const { viewNoteMode } = useAppStore(
    useShallow((s) => ({
      viewNoteMode: s.viewNoteMode,
    })),
  );
  const capabilities = useMemo(
    () => getMFDIViewCapabilities({ noteMode: viewNoteMode }),
    [viewNoteMode],
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
    if (!("handlers" in component)) return;
    (component as any).handlers.onCopyAllPosts = () => {
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
      (component as any).handlers.onCopyAllPosts = undefined;
    };
  }, [
    component,
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

function useViewSync(view: MFDIView | null) {
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
    if (!view) return;
    view.setStatePartial({ granularity });
  }, [view, granularity]);

  useEffect(() => {
    if (!view) return;
    view.setStatePartial({ asTask });
  }, [view, asTask]);

  useEffect(() => {
    if (!view) return;
    view.setStatePartial({ timeFilter });
  }, [view, timeFilter]);

  useEffect(() => {
    if (!view) return;
    view.setStatePartial({ dateFilter });
  }, [view, dateFilter]);

  useEffect(() => {
    if (!view) return;
    view.setStatePartial({ displayMode });
  }, [view, displayMode]);

  useEffect(() => {
    if (!view) return;
    view.setStatePartial({ activeTopic });
  }, [view, activeTopic]);

  useEffect(() => {
    if (!view) return;
    view.handlers.onSubmit = handleSubmit;
    return () => {
      view.handlers.onSubmit = undefined;
    };
  }, [view, handleSubmit]);

  useEffect(() => {
    if (!view) return;
    view.handlers.onOpenDailyNoteAction = handleClickOpenDailyNote;
    return () => {
      view.handlers.onOpenDailyNoteAction = undefined;
    };
  }, [view, handleClickOpenDailyNote]);

  useEffect(() => {
    if (!view) return;
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
    if (!view) return;
    view.handlers.onChangeTopic = setActiveTopic;
    return () => {
      view.handlers.onChangeTopic = undefined;
    };
  }, [view, setActiveTopic]);

  useEffect(() => {
    if (!view) return;
    view.handlers.onChangeAsTask = (nextAsTask: boolean) => {
      setAsTask(nextAsTask);
    };
    return () => {
      view.handlers.onChangeAsTask = undefined;
    };
  }, [view, setAsTask]);

  useEffect(() => {
    if (!view) return;
    view.handlers.onChangeTimeFilter = (nextTimeFilter: TimeFilter) => {
      setTimeFilter(nextTimeFilter);
    };
    return () => {
      view.handlers.onChangeTimeFilter = undefined;
    };
  }, [view, setTimeFilter]);

  useEffect(() => {
    if (!view) return;
    view.handlers.onChangeDateFilter = (nextDateFilter: DateFilter) => {
      setDateFilter(nextDateFilter);
    };
    return () => {
      view.handlers.onChangeDateFilter = undefined;
    };
  }, [view, setDateFilter]);

  useEffect(() => {
    if (!view) return;
    view.handlers.onChangeDisplayMode = (nextDisplayMode: DisplayMode) => {
      setDisplayMode(nextDisplayMode);
    };
    return () => {
      view.handlers.onChangeDisplayMode = undefined;
    };
  }, [view, setDisplayMode]);

  useEffect(() => {
    if (!view) return;
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
    if (!view) return;
    view.handlers.onToggleSidebar = () => {
      setSidebarOpenRef.current(!sidebarOpenRef.current);
    };
    return () => {
      view.handlers.onToggleSidebar = undefined;
    };
  }, [view]);

  useEffect(() => {
    if (!view) return;
    view.handlers.onOpenDraftList = () => {
      openDraftList();
    };
    return () => {
      view.handlers.onOpenDraftList = undefined;
    };
  }, [view, openDraftList, store]);

  useEffect(() => {
    if (!view) return;
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
