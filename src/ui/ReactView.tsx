import { Box, Flex } from "@chakra-ui/react";
import { App } from "obsidian";
import * as React from "react";
import { useEffect } from "react";
import { Settings } from "../settings";
import { CountDisplay } from "./components/CountDisplay";
import { EmptyState } from "./components/EmptyState";
import { InputArea } from "./components/InputArea";
import { PostListView } from "./components/PostListView";
import { TaskListView } from "./components/TaskListView";
import { AppContextProvider, useAppContext } from "./context/AppContext";
import { useMFDIApp } from "./hooks/useMFDIApp";
import { useViewSync } from "./hooks/useViewSync";
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
      <ReactViewContent />
    </AppContextProvider>
  );
};

const ReactViewContent = () => {
  const { app, settings, view } = useAppContext();
  const {
    activeTopic,
    setActiveTopic,
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
    posts,
    setPosts,
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
    handleClickOpenDailyNote,
    handleSubmit,
    startEdit,
    cancelEdit,
    deletePost,
    handleClickTime,
    updateTaskChecked,
    openTaskInEditor,
    deleteTask,
    taskContextMenu,
    isToday,
  } = useMFDIApp();

  useViewSync(view, granularity, activeTopic, asTask, timeFilter, {
    handleSubmit,
    handleClickOpenDailyNote,
    setGranularity,
    setTimeFilter,
    setCurrentDailyNote,
    setPosts,
    setTasks,
    setActiveTopic,
    setAsTask,
    input,
    setInput,
  });

  useEffect(() => {
    view.handlers.onFocusRequested = () => {
      inputRef.current?.focus();
    };
    return () => {
      view.handlers.onFocusRequested = undefined;
    };
  }, [view, inputRef]);

  // Initial scroll position
  useEffect(() => {
    if (!currentDailyNote || !scrollContainerRef.current) return;
    const timer = setTimeout(() => {
      scrollContainerRef.current?.scrollTo({ top: 0 });
    }, 0);
    return () => clearTimeout(timer);
  }, [currentDailyNote]);

  const isEmpty =
    !currentDailyNote ||
    (asTask ? tasks.length === 0 : filteredPosts.length === 0);

  const renderInputArea = (
    <InputArea
      date={date}
      granularity={granularity}
      input={input}
      setInput={setInput}
      asTask={asTask}
      editingPost={editingPost}
      canSubmit={canSubmit}
      isToday={isToday}
      inputRef={inputRef}
      handlers={{
        handleClickMovePrevious,
        handleClickMoveNext,
        handleClickToday,
        handleChangeCalendarDate,
        handleSubmit,
        cancelEdit,
      }}
    />
  );

  const activeTopicName = settings.topics.find((t) => t.id === activeTopic)?.title;

  const renderCountDisplay = (
    <CountDisplay
      date={date}
      granularity={granularity}
      asTask={asTask}
      tasksCount={tasks.length}
      filteredPostsCount={filteredPosts.length}
      allPostsCount={posts.length}
      timeFilter={timeFilter}
      activeTopicName={activeTopicName}
      onTopicChange={setActiveTopic}
      onGranularityChange={setGranularity}
      onAsTaskChange={setAsTask}
    />
  );

  return (
    <Flex
      flexDirection="column"
      height="100%"
      className="root"
      position="relative"
      backgroundColor="transparent"
      marginX="var(--size-4-2)"
    >
      {renderInputArea}
      {renderCountDisplay}

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
          <TaskListView
            date={date}
            tasks={tasks}
            updateTaskChecked={updateTaskChecked}
            taskContextMenu={taskContextMenu}
            isToday={isToday}
          />
        ) : (
          <PostListView
            filteredPosts={filteredPosts}
            editingPostOffset={editingPostOffset}
            granularity={granularity}
            viewedDate={date}
            timeFilter={timeFilter}
            handleClickTime={handleClickTime}
            startEdit={startEdit}
            deletePost={deletePost}
            isToday={isToday}
          />
        )}
      </Box>
    </Flex>
  );
};
