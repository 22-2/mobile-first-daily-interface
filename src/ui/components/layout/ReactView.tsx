import { Box, Flex } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "obsidian";
import * as React from "react";
import { Settings } from "src/settings";
import { CountDisplay } from "src/ui/components/CountDisplay";
import { EmptyState } from "src/ui/components/EmptyState";
import { InputArea } from "src/ui/components/InputArea";
import { MiniCalendar } from "src/ui/components/layout/MiniCalendar";
import { SidebarScales } from "src/ui/components/layout/SidebarScales";
import { PostListView } from "src/ui/components/posts/PostListView";
import { TaskListView } from "src/ui/components/tasks/TaskListView";
import { AppContextProvider, useAppContext } from "src/ui/context/AppContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useNoteSync } from "src/ui/hooks/useNoteSync";
import { DraftListModal } from "src/ui/modals/DraftListModal";
import { MFDIEditorModal } from "src/ui/modals/MFDIEditorModal";
import {
  AppStoreApi,
  AppStoreProvider,
  createAppStore,
  initializeAppStore,
  useCurrentAppStore
} from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import {
  DateFilter,
  DisplayMode,
  Granularity,
  Post,
  TimeFilter
} from "src/ui/types";
import { isTimelineView } from "src/ui/utils/view-mode";
import { MFDIView } from "src/ui/view/MFDIView";
import {
  DEFAULT_MFDI_VIEW_STATE,
  getMFDIViewCapabilities
} from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

const queryClient = new QueryClient();

export type { Post };

export const ReactView = ({
  app,
  settings,
  view,
}: {
  app: App;
  settings: Settings;
  view: MFDIView;
}) => {
  const storeRef = React.useRef<AppStoreApi | null>(null);
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
  const { view, settings, storage, app, appHelper } = useAppContext();
  const store = useCurrentAppStore();
  const viewState = view.getState();
  const capabilities = React.useMemo(
    () => getMFDIViewCapabilities(viewState),
    [view, viewState.noteMode],
  );

  React.useEffect(() => {
    initializeAppStore({ app, appHelper, settings, storage }, store);
  }, [settings, storage, app, appHelper, store]);

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
  } = usePostsStore(
    useShallow((state) => ({
      posts: state.posts,
      updatePosts: state.updatePosts,
      updateTasks: state.updateTasks,
      updatePostsForWeek: state.updatePostsForWeek,
      updatePostsForDays: state.updatePostsForDays,
    })),
  );

  const { inputRef, scrollContainerRef } = useEditorStore(
    useShallow((state) => ({
      inputRef: state.inputRef,
      scrollContainerRef: state.scrollContainerRef,
    })),
  );

  useNoteSync();

  React.useEffect(() => {
    store.getState().setViewContext({
      noteMode: viewState.noteMode,
      fixedNotePath: viewState.fixedNotePath,
    });

    // fixedビューでは periodic 側の永続状態を引き継がない
    if (viewState.noteMode === "fixed") {
      store.setState({
        displayMode: DEFAULT_MFDI_VIEW_STATE.displayMode,
        granularity: DEFAULT_MFDI_VIEW_STATE.granularity,
        dateFilter: DEFAULT_MFDI_VIEW_STATE.dateFilter,
        timeFilter: DEFAULT_MFDI_VIEW_STATE.timeFilter,
        asTask: DEFAULT_MFDI_VIEW_STATE.asTask,
        threadFocusRootId: null,
      });
    }
  }, [store, view, viewState.noteMode, viewState.fixedNotePath]);

  React.useEffect(() => {
    store.getState().updateCurrentDailyNote(app);
  }, [
    store,
    app,
    date,
    granularity,
    activeTopic,
    viewState.noteMode,
    viewState.fixedNotePath,
  ]);

  React.useEffect(() => {
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
  ]);

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!currentDailyNote) return;

    const promises: Promise<void>[] = [updateTasks(currentDailyNote)];
    if (dateFilter === "today") {
      promises.push(updatePosts(currentDailyNote));
    }
    Promise.all(promises);
  }, [currentDailyNote, dateFilter, updatePosts, updateTasks]);

  // Sync state/handlers with Obsidian View
  useViewSync(view);

  // Handle focus requested from View
  React.useEffect(() => {
    view.handlers.onFocusRequested = () => {
      inputRef.current?.focus();
    };
    return () => {
      view.handlers.onFocusRequested = undefined;
    };
  }, [view, inputRef]);

  // Initial scroll position when note changes
  React.useEffect(() => {
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
  const capabilities = React.useMemo(
    () => getMFDIViewCapabilities(viewState),
    [view, viewState.noteMode],
  );
  const settings = useSettingsStore(
    useShallow((s) => ({
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

  React.useEffect(() => {
    view.handlers.onCopyAllPosts = () => {
      const text = filteredPosts
        .map((p) => `${p.timestamp.format("YYYY-MM-DD HH:mm")}\n${p.message}`)
        .join("\n\n");
      navigator.clipboard.writeText(text);
    };
    return () => {
      view.handlers.onCopyAllPosts = undefined;
    };
  }, [view, filteredPosts]);

  const { granularity, asTask, dateFilter, sidebarOpen, setSidebarOpen } =
    settings;

  const [containerWidth, setContainerWidth] = React.useState(1000);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastWidthRef = React.useRef(containerWidth);

  const [sideBarViewDate, setSideBarViewDate] = React.useState(() =>
    window.moment(),
  );

  React.useEffect(() => {
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
      h="100%"
      position="relative"
      w="100%"
      overflow="hidden"
      ref={containerRef}
    >
      {/* Main Content */}
      <Flex
        flexDirection="column"
        height="100%"
        className="root"
        position="relative"
        backgroundColor="transparent"
        flexGrow={1}
        marginLeft="var(--size-4-2)"
        marginRight={effectivelyOpen ? 0 : "var(--size-4-2)"}
        overflow="hidden"
      >
        <InputArea />
        <CountDisplay />

        <Box
          className="mfdi-scroll-container"
          flexGrow={1}
          overflowY="scroll"
          overflowX="hidden"
          display="flex"
          flexDirection={"column"}
          ref={scrollContainerRef}
        >
          {isEmpty ? (
            <EmptyState granularity={granularity} />
          ) : asTask ? (
            <TaskListView />
          ) : (
            <PostListView />
          )}
        </Box>
      </Flex>

      {/* Sidebar: MiniCalendar (Moved to Right) */}
      {capabilities.supportsSidebar && (
        <Box
          w={effectivelyOpen ? "260px" : "0px"}
          minW={effectivelyOpen ? "260px" : "0px"}
          h="100%"
          display={effectivelyOpen ? "flex" : "none"}
          flexDirection="column"
          py="var(--size-4-2)"
          px={0}
          ml={effectivelyOpen ? "var(--size-4-2)" : 0}
          mr="var(--size-4-2)"
          transition="all 0.2s ease-in-out"
          overflow="hidden"
        >
          <MiniCalendar onViewDateChange={setSideBarViewDate} />
          <SidebarScales viewedDate={sideBarViewDate} />
        </Box>
      )}
    </Flex>
  );
};

function useViewSync(view: MFDIView) {
  const { app, settings } = useAppContext();
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

  const { input, inputRef } = useEditorStore(
    useShallow((state) => ({
      input: state.input,
      inputRef: state.inputRef,
    })),
  );
  const { setInput } = store.getState();

  const { handleSubmit } = usePostActions();
  const handleClickOpenDailyNote = React.useCallback(() => {
    return store.getState().handleClickOpenDailyNote(app, settings);
  }, [store, app, settings]);

  const { setCurrentDailyNote, setPosts, setTasks } = store.getState();

  const inputRefVal = React.useRef(input);
  const inputRefObj = React.useRef(inputRef);
  const sidebarOpenRef = React.useRef(sidebarOpen);
  const setSidebarOpenRef = React.useRef(setSidebarOpen);

  React.useEffect(() => {
    sidebarOpenRef.current = sidebarOpen;
  }, [sidebarOpen]);

  React.useEffect(() => {
    setSidebarOpenRef.current = setSidebarOpen;
  }, [setSidebarOpen]);

  React.useEffect(() => {
    inputRefVal.current = input;
  }, [input]);

  React.useEffect(() => {
    inputRefObj.current = inputRef;
  }, [inputRef]);

  React.useEffect(() => {
    view.setStatePartial({ granularity });
  }, [view, granularity]);

  React.useEffect(() => {
    view.setStatePartial({ asTask });
  }, [view, asTask]);

  React.useEffect(() => {
    view.setStatePartial({ timeFilter });
  }, [view, timeFilter]);

  React.useEffect(() => {
    view.setStatePartial({ dateFilter });
  }, [view, dateFilter]);

  React.useEffect(() => {
    view.setStatePartial({ displayMode });
  }, [view, displayMode]);

  React.useEffect(() => {
    view.setStatePartial({ activeTopic });
  }, [view, activeTopic]);

  React.useEffect(() => {
    view.handlers.onSubmit = handleSubmit;
    return () => {
      view.handlers.onSubmit = undefined;
    };
  }, [view, handleSubmit]);

  React.useEffect(() => {
    view.handlers.onOpenDailyNoteAction = handleClickOpenDailyNote;
    return () => {
      view.handlers.onOpenDailyNoteAction = undefined;
    };
  }, [view, handleClickOpenDailyNote]);

  React.useEffect(() => {
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

  React.useEffect(() => {
    view.handlers.onChangeTopic = setActiveTopic;
    return () => {
      view.handlers.onChangeTopic = undefined;
    };
  }, [view, setActiveTopic]);

  React.useEffect(() => {
    view.handlers.onChangeAsTask = (nextAsTask: boolean) => {
      setAsTask(nextAsTask);
    };
    return () => {
      view.handlers.onChangeAsTask = undefined;
    };
  }, [view, setAsTask]);

  React.useEffect(() => {
    view.handlers.onChangeTimeFilter = (nextTimeFilter: TimeFilter) => {
      setTimeFilter(nextTimeFilter);
    };
    return () => {
      view.handlers.onChangeTimeFilter = undefined;
    };
  }, [view, setTimeFilter]);

  React.useEffect(() => {
    view.handlers.onChangeDateFilter = (nextDateFilter: DateFilter) => {
      setDateFilter(nextDateFilter);
    };
    return () => {
      view.handlers.onChangeDateFilter = undefined;
    };
  }, [view, setDateFilter]);

  React.useEffect(() => {
    view.handlers.onChangeDisplayMode = (nextDisplayMode: DisplayMode) => {
      setDisplayMode(nextDisplayMode);
    };
    return () => {
      view.handlers.onChangeDisplayMode = undefined;
    };
  }, [view, setDisplayMode]);

  React.useEffect(() => {
    if (isReadOnly) {
      view.handlers.onOpenModalEditor = undefined;
      return;
    }

    view.handlers.onOpenModalEditor = () => {
      const modal = new MFDIEditorModal(app, {
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

  React.useEffect(() => {
    view.handlers.onToggleSidebar = () => {
      setSidebarOpenRef.current(!sidebarOpenRef.current);
    };
    return () => {
      view.handlers.onToggleSidebar = undefined;
    };
  }, [view]);

  React.useEffect(() => {
    view.handlers.onOpenDraftList = () => {
      new DraftListModal(app, store).open();
    };
    return () => {
      view.handlers.onOpenDraftList = undefined;
    };
  }, [view, app, store]);
}
