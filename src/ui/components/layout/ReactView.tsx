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
  } = useMFDIContext();

  const isEmpty =
    (dateFilter === "today" && !currentDailyNote) ||
    (asTask ? tasks.length === 0 : filteredPosts.length === 0);

  return (
    <Flex h="100%" position="relative" w="100%" overflow="hidden">
      {/* Sidebar: MiniCalendar */}
      <Box 
        w="260px" 
        minW="260px" 
        h="100%" 
        display={{ base: "none", md: "flex" }} 
        flexDirection="column" 
        py="var(--size-4-2)"
        px={0}
      >
        <MiniCalendar />
      </Box>

      {/* Main Content */}
      <Flex
        flexDirection="column"
        height="100%"
        className="root"
        position="relative"
        backgroundColor="transparent"
        flexGrow={1}
        marginX="var(--size-4-2)"
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
    </Flex>
  );
};

