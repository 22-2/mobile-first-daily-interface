import { Box, Flex } from "@chakra-ui/react";
import { App } from "obsidian";
import * as React from "react";
import { Settings } from "../settings";
import { CountDisplay } from "./components/CountDisplay";
import { EmptyState } from "./components/EmptyState";
import { InputArea } from "./components/InputArea";
import { PostListView } from "./components/PostListView";
import { TaskListView } from "./components/TaskListView";
import { AppContextProvider, useAppContext } from "./context/AppContext";
import { MFDIAppProvider, useMFDIContext } from "./context/MFDIAppContext";
import { MFDIView } from "./MFDIView";
import { Post } from "./types";

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
    filteredPosts,
    scrollContainerRef,
  } = useMFDIContext();

  const isEmpty =
    !currentDailyNote ||
    (asTask ? tasks.length === 0 : filteredPosts.length === 0);

  return (
    <Flex
      flexDirection="column"
      height="100%"
      className="root"
      position="relative"
      backgroundColor="transparent"
      marginX="var(--size-4-2)"
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
  );
};


