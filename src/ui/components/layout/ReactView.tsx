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
import { useSettingsStore } from "src/ui/store/settingsStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useShallow } from "zustand/shallow";
import { MFDIAppProvider, useMFDIContext } from "src/ui/context/MFDIAppContext";
import { Post } from "src/ui/types";
import { MFDIView } from "src/ui/view/MFDIView";

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
  return (
    <AppContextProvider app={app} settings={settings} view={view}>
      <QueryClientProvider client={queryClient}>
        <MFDIAppProvider>
          <ReactViewContent />
        </MFDIAppProvider>
      </QueryClientProvider>
    </AppContextProvider>
  );
};

const ReactViewContent = () => {
  const { view } = useAppContext();
  const settings = useSettingsStore(useShallow(s => ({
    granularity: s.granularity,
    asTask: s.asTask,
    dateFilter: s.dateFilter,
    sidebarOpen: s.sidebarOpen,
    setSidebarOpen: s.setSidebarOpen,
    timeFilter: s.timeFilter,
    displayMode: s.displayMode,
  })));

  const { tasks, posts } = usePostsStore(useShallow(s => ({
    tasks: s.tasks,
    posts: s.posts,
  })));

  const { currentDailyNote } = useNoteStore(useShallow(s => ({
    currentDailyNote: s.currentDailyNote,
  })));

  const { scrollContainerRef } = useMFDIContext();

  const filteredPosts = useFilteredPosts({
    posts,
    ...settings,
  });

  const { granularity, asTask, dateFilter, sidebarOpen, setSidebarOpen } = settings;

  const [containerWidth, setContainerWidth] = React.useState(1000);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastWidthRef = React.useRef(containerWidth);

  const [sideBarViewDate, setSideBarViewDate] = React.useState(() => window.moment());

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

  const effectivelyOpen = sidebarOpen;

  const isEmpty =
    (dateFilter === "today" && !currentDailyNote) ||
    (asTask ? tasks.length === 0 : filteredPosts.length === 0);

  return (
    <Flex h="100%" position="relative" w="100%" overflow="hidden" ref={containerRef}>
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
    </Flex>
  );
};

