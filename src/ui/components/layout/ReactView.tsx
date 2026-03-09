import { Box, Flex } from "@chakra-ui/react";
import { App } from "obsidian";
import * as React from "react";
import { Settings } from "../../../settings";
import { AppContextProvider, useAppContext } from "../../context/AppContext";
import { MFDIAppProvider, useMFDIContext } from "../../context/MFDIAppContext";
import { Post } from "../../types";
import { MFDIView } from "../../view/MFDIView";
import { CountDisplay } from "../CountDisplay";
import { EmptyState } from "../EmptyState";
import { InputArea } from "../InputArea";
import { PostListView } from "../PostListView";
import { TaskListView } from "../TaskListView";
import { MiniCalendar } from "./MiniCalendar";
import { SidebarScales } from "./SidebarScales";

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
      <MFDIAppProvider>
        <ReactViewContent />
      </MFDIAppProvider>
    </AppContextProvider>
  );
};

const ReactViewContent = () => {
  const { view } = useAppContext();
  const {
    granularity,
    currentDailyNote,
    asTask,
    tasks,
    dateFilter,
    filteredPosts,
    scrollContainerRef,
    sidebarOpen,
    setSidebarOpen,
  } = useMFDIContext();

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

