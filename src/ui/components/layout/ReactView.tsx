import type { App } from "obsidian";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Settings } from "src/settings";
import { MiniCalendar } from "src/ui/components/calendar/MiniCalendar";
import { EmptyState } from "src/ui/components/EmptyState";
import { InputArea } from "src/ui/components/inputarea/InputArea";
import { SidebarScales } from "src/ui/components/layout/SidebarScales";
import { TagList } from "src/ui/components/layout/TagList";
import { PostListView } from "src/ui/components/posts/PostListView";
import { Box, Flex, Spinner } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import { INPUT_AREA_SIZE } from "src/ui/config/consntants";
import { StatusBar } from "src/ui/components/statusbar/StatusBar";
import { TaskListView } from "src/ui/components/tasks/TaskListView";
import { AppContextProvider, useAppContext } from "src/ui/context/AppContext";
import {
  ComponentContextProvider,
  useObsidianComponent,
} from "src/ui/context/ComponentContext";
import {
  EditorRefsProvider,
  useEditorRefs,
} from "src/ui/context/EditorRefsContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useCSSLoaded } from "src/ui/hooks/useCSSLoaded";
import { useDbSync } from "src/ui/hooks/useDbSync";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useNoteSync } from "src/ui/hooks/useNoteSync";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { bindSearchDelegates } from "src/ui/components/layout/searchDelegates";
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
import { settingsStore, useSettingsStore } from "src/ui/store/settingsStore";
import { getInputStorageKey } from "src/ui/store/slices/inputStorage";
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
          <EditorRefsProvider>
            <MFDIAppRoot>
              <ReactViewContent />
            </MFDIAppRoot>
          </EditorRefsProvider>
        </AppStoreProvider>
      </ComponentContextProvider>
    </AppContextProvider>
  );
};

const MFDIAppRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, storage, shell } = useAppContext();
  const component = useObsidianComponent() as MFDIView;
  const store = useCurrentAppStore();
  const { viewNoteMode, file } = useAppStore(
    useShallow((s) => ({
      viewNoteMode: s.viewNoteMode,
      file: s.file,
    })),
  );

  const capabilities = useMemo(
    () => getMFDIViewCapabilities({ noteMode: viewNoteMode }),
    [viewNoteMode],
  );

  useLayoutEffect(() => {
    // 意図: 子の live editor は mount 時の passive effect で初期化される。
    // ここで hydration が遅れると、空の初期 state が先に editor/localStorage へ流れて復元値を潰す。
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

  const { updateTasks } = usePostsStore(
    useShallow((state) => ({
      updateTasks: state.updateTasks,
    })),
  );

  const { displayMode, searchQuery } = useSettingsStore(
    useShallow((state) => ({
      displayMode: state.displayMode,
      searchQuery: state.searchQuery,
    })),
  );

  const { inputRef, scrollContainerRef } = useEditorRefs();

  useNoteSync();
  useDbSync();

  useEffect(() => {
    if (!("getState" in component)) return;

    const viewState = component.getState();
    store.getState().setViewContext({
      noteMode: viewState.noteMode,
      file: viewState.file,
    });

    // fixedビューでは periodic 側の永続状態を引き継がない
    if (viewState.noteMode === "fixed") {
      const fixedDefaults = createDefaultMFDIViewState({
        noteMode: "fixed",
        file: viewState.file,
      });

      store.setState({
        displayMode: fixedDefaults.displayMode,
        granularity: fixedDefaults.granularity,
        dateFilter: fixedDefaults.dateFilter,
        timeFilter: fixedDefaults.timeFilter,
        asTask: fixedDefaults.asTask,
        threadOnly: fixedDefaults.threadOnly,
        // fixedノートではタグ絞り込みを許すと periodic 側の状態が見え方に混入する。
        activeTag: null,
        threadFocusRootId: null,
      });
    }
  }, [store, component, viewNoteMode, file]);

  useEffect(() => {
    store.getState().updateCurrentDailyNote(shell);
  }, [
    store,
    shell,
    date,
    granularity,
    activeTopic,
    viewNoteMode,
    file,
  ]);

  // updatePostsFromDB is no longer needed here as SWR handles it

  // updatePostsForWeek and updatePostsForDays are no longer needed here as SWR handles it

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
    // updatePosts is no longer needed here
    Promise.all(promises);
  }, [
    currentDailyNote,
    dateFilter,
    // updatePosts,
    updateTasks,
    viewNoteMode,
    searchQuery,
  ]);

  // Sync state/handlers with Obsidian View
  useViewSync(component);

  // Handle focus requested from View
  useEffect(() => {
    component.actionDelegates.onFocusRequested = () => {
      inputRef.current?.focus();
    };
    return () => {
      component.actionDelegates.onFocusRequested = undefined;
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
  const component = useObsidianComponent() as MFDIView;
  const isCSSLoaded = useCSSLoaded();
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
      threadOnly: s.threadOnly,
      dateFilter: s.dateFilter,
      sidebarOpen: s.sidebarOpen,
      setSidebarOpen: s.setSidebarOpen,
      timeFilter: s.timeFilter,
      displayMode: s.displayMode,
      threadFocusRootId: s.threadFocusRootId,
      searchQuery: s.searchQuery,
      searchInputOpen: s.searchInputOpen,
      setSearchQuery: s.setSearchQuery,
      setSearchInputOpen: s.setSearchInputOpen,
      inputAreaSize: s.inputAreaSize,
    })),
  );
  const setSearchQuery = settings.setSearchQuery;
  const setSearchInputOpen = settings.setSearchInputOpen;

  const { posts } = useUnifiedPosts();
  const { tasks } = usePostsStore(useShallow((s) => ({ tasks: s.tasks })));

  const { currentDailyNote } = useNoteStore(
    useShallow((s) => ({
      currentDailyNote: s.currentDailyNote,
    })),
  );

  const { scrollContainerRef } = useEditorRefs();

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
    return bindSearchDelegates(component, {
      setSearchQuery,
      setSearchInputOpen,
    });
  }, [component, setSearchInputOpen, setSearchQuery]);

  useEffect(() => {
    component.actionDelegates.onCopyAllPosts = () => {
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
      component.actionDelegates.onCopyAllPosts = undefined;
    };
  }, [
    component,
    filteredPosts,
    filteredPostsWithThreadReplies,
    settings.threadFocusRootId,
    settings.displayMode,
  ]);

  const {
    granularity,
    asTask,
    dateFilter,
    sidebarOpen,
    setSidebarOpen,
  } = settings;

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

  const content = useMemo(() => {
    if (!isCSSLoaded) {
      return;
    }

    return isEmpty ? (
      <EmptyState granularity={granularity} />
    ) : asTask ? (
      <TaskListView />
    ) : (
      <PostListView />
    );
  }, [isEmpty, asTask, granularity, isCSSLoaded]);

  return (
    <Flex
      className="root h-full w-full overflow-hidden relative"
      ref={containerRef}
    >
      {/* Main Content */}
      <Flex
        className={cn(
          "max-content flex-col h-full relative flex-grow overflow-hidden",
        )}
      >
        <InputArea />
        <StatusBar />

        <Flex
          className="mfdi-scroll-container flex-col flex-grow overflow-y-scroll overflow-x-hidden"
          ref={scrollContainerRef}
        >
          {content}
        </Flex>
      </Flex>

      {/* Sidebar: MiniCalendar (Moved to Right) */}
      {capabilities.supportsSidebar && (
        <Box
          className={`${effectivelyOpen ? "flex w-[260px] min-w-[260px] ml-[var(--size-4-2)]" : "hidden w-0 min-w-0"} h-full flex-col py-[var(--size-4-2)] px-0 mr-[var(--size-4-2)] transition-all duration-200 overflow-hidden`}
        >
          <MiniCalendar onViewDateChange={setSideBarViewDate} />
          <SidebarScales
            viewedDate={sideBarViewDate}
            onViewDateChange={setSideBarViewDate}
          />
          <TagList />
        </Box>
      )}

      {!isCSSLoaded && (
        <div
          style={{
            position: "absolute",
            inset: "0",
            zIndex: 20,
            backgroundColor: "var(--background-primary)",
            display: "flex",
          }}
        >
          <Spinner className="size-6 text-[var(--text-muted)] [animation-duration:0.8s]" />
        </div>
      )}
    </Flex>
  );
};

function useViewSync(view: MFDIView | null) {
  const { shell, settings } = useAppContext();
  const { openDraftList, openModalEditor } = useObsidianUi();
  const store = useCurrentAppStore();
  const { inputRef } = useEditorRefs();

  const {
    granularity,
    activeTopic,
    asTask,
    threadOnly,
    timeFilter,
    dateFilter,
    displayMode,
    isReadOnly,
    sidebarOpen,
    searchQuery,
    inputAreaSize,
    setGranularity,
    setTimeFilter,
    setDateFilter,
    setActiveTopic,
    setAsTask,
    setThreadOnly,
    setDisplayMode,
    setSidebarOpen,
    setSearchQuery,
    setInputAreaSize,
  } = useSettingsStore(
    useShallow((state) => ({
      granularity: state.granularity,
      activeTopic: state.activeTopic,
      asTask: state.asTask,
      threadOnly: state.threadOnly,
      timeFilter: state.timeFilter,
      dateFilter: state.dateFilter,
      displayMode: state.displayMode,
      isReadOnly: state.isReadOnly(),
      sidebarOpen: state.sidebarOpen,
      searchQuery: state.searchQuery,
      inputAreaSize: state.inputAreaSize,
      setGranularity: state.setGranularity,
      setTimeFilter: state.setTimeFilter,
      setDateFilter: state.setDateFilter,
      setActiveTopic: state.setActiveTopic,
      setAsTask: state.setAsTask,
      setThreadOnly: state.setThreadOnly,
      setDisplayMode: state.setDisplayMode,
      setSidebarOpen: state.setSidebarOpen,
      setSearchQuery: state.setSearchQuery,
      setInputAreaSize: state.setInputAreaSize,
    })),
  );

  const { inputSnapshot, getInputValue, replaceInput } = useEditorStore(
    useShallow((state) => ({
      inputSnapshot: state.inputSnapshot,
      getInputValue: state.getInputValue,
      replaceInput: state.replaceInput,
    })),
  );

  const { handleSubmit } = usePostActions();
  const handleClickOpenDailyNote = useCallback(() => {
    return store.getState().handleClickOpenDailyNote(shell, settings);
  }, [store, shell, settings]);

  const { setCurrentDailyNote, setTasks } = store.getState();

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
    view.setStatePartial({ threadOnly });
  }, [view, threadOnly]);

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
    view.setStatePartial({ searchQuery });
  }, [view, searchQuery]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onSubmit = handleSubmit;
    return () => {
      view.actionDelegates.onSubmit = undefined;
    };
  }, [view, handleSubmit]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onOpenDailyNoteAction = handleClickOpenDailyNote;
    return () => {
      view.actionDelegates.onOpenDailyNoteAction = undefined;
    };
  }, [view, handleClickOpenDailyNote]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeGranularity = (nextGranularity: Granularity) => {
      setGranularity(nextGranularity);
      if (nextGranularity !== "day") {
        setTimeFilter("all");
        setDateFilter("today");
      }
      setCurrentDailyNote(null);
      setTasks([]);
    };
    return () => {
      view.actionDelegates.onChangeGranularity = undefined;
    };
  }, [
    view,
    setGranularity,
    setTimeFilter,
    setDateFilter,
    setCurrentDailyNote,
    setTasks,
  ]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeTopic = setActiveTopic;
    return () => {
      view.actionDelegates.onChangeTopic = undefined;
    };
  }, [view, setActiveTopic]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeAsTask = (nextAsTask: boolean) => {
      setAsTask(nextAsTask);
    };
    return () => {
      view.actionDelegates.onChangeAsTask = undefined;
    };
  }, [view, setAsTask]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeThreadOnly = (nextThreadOnly: boolean) => {
      setThreadOnly(nextThreadOnly);
    };
    return () => {
      view.actionDelegates.onChangeThreadOnly = undefined;
    };
  }, [view, setThreadOnly]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeTimeFilter = (nextTimeFilter: TimeFilter) => {
      setTimeFilter(nextTimeFilter);
    };
    return () => {
      view.actionDelegates.onChangeTimeFilter = undefined;
    };
  }, [view, setTimeFilter]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeDateFilter = (nextDateFilter: DateFilter) => {
      setDateFilter(nextDateFilter);
    };
    return () => {
      view.actionDelegates.onChangeDateFilter = undefined;
    };
  }, [view, setDateFilter]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeDisplayMode = (nextDisplayMode: DisplayMode) => {
      setDisplayMode(nextDisplayMode);
    };
    return () => {
      view.actionDelegates.onChangeDisplayMode = undefined;
    };
  }, [view, setDisplayMode]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onSearchQueryChange = (query: string) => {
      setSearchQuery(query);
    };
    return () => {
      view.actionDelegates.onSearchQueryChange = undefined;
    };
  }, [view, setSearchQuery]);

  useEffect(() => {
    if (!view) return;
    if (isReadOnly) {
      view.actionDelegates.onEditorExpand = undefined;
      return;
    }

    view.actionDelegates.onEditorExpand = () => {
      setInputAreaSize(
        inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED
          ? INPUT_AREA_SIZE.DEFAULT
          : INPUT_AREA_SIZE.MAXIMIZED,
      );
    };
    return () => {
      view.actionDelegates.onEditorExpand = undefined;
    };
  }, [
    view,
    openModalEditor,
    getInputValue,
    replaceInput,
    isReadOnly,
    inputAreaSize,
    setInputAreaSize,
  ]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onToggleSidebar = () => {
      setSidebarOpenRef.current(!sidebarOpenRef.current);
    };
    return () => {
      view.actionDelegates.onToggleSidebar = undefined;
    };
  }, [view]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onOpenDraftList = () => {
      openDraftList();
    };
    return () => {
      view.actionDelegates.onOpenDraftList = undefined;
    };
  }, [view, openDraftList, store]);

  useEffect(() => {
    if (!view) return;
    // テスト用: 外部から内容を設定するため replaceInput を使う
    // （syncInputSession はエディタ→ストア片方向専用）
    view.actionDelegates.onSetLiveEditorContentForTesting = (content: string) => {
      replaceInput(content);
    };
    view.actionDelegates.onGetLiveEditorContentForTesting = () => {
      return getInputValue();
    };

    return () => {
      view.actionDelegates.onSetLiveEditorContentForTesting = undefined;
      view.actionDelegates.onGetLiveEditorContentForTesting = undefined;
    };
  }, [view, replaceInput, getInputValue]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onGetDebugStateForTesting = () => {
      const state = settingsStore.getState();
      const appState = store.getState();
      return {
        settingsDateIso: state.date.toISOString(),
        displayMode: state.displayMode,
        activeTopic: state.activeTopic,
        inputSnapshot: appState.inputSnapshot,
        editingPostMessage: appState.editingPost?.message ?? null,
        persistedInput:
          appState.storage?.get<string>(
            getInputStorageKey(appState.viewNoteMode, appState.file),
            "",
          ) ?? "",
        editorSnapshot: inputRef.current?.getContentSnapshot() ?? null,
      };
    };

    return () => {
      view.actionDelegates.onGetDebugStateForTesting = undefined;
    };
  }, [view, store]);
}
