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
import { useMFDIApp } from "./hooks/useMFDIApp";
import { useViewSync } from "./hooks/useViewSync";
import { Post } from "./types";

export type { Post };

export const ReactView = ({
  app,
  settings,
  view,
}: {
  app: App;
  settings: Settings;
  view: any;
}) => {
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
  } = useMFDIApp({ app, settings, view });

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
    app,
    input,
    setInput,
  });

  // Initial scroll position
  useEffect(() => {
    if (!currentDailyNote || !scrollContainerRef.current) return;
    const timer = setTimeout(() => {
      if (settings.reverseOrder) {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
        });
      } else {
        scrollContainerRef.current?.scrollTo({ top: 0 });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [currentDailyNote, settings.reverseOrder]);

  const isEmpty =
    !currentDailyNote ||
    (asTask ? tasks.length === 0 : filteredPosts.length === 0);

  const renderInputArea = (
    <InputArea
      app={app}
      view={view}
      date={date}
      granularity={granularity}
      input={input}
      setInput={setInput}
      asTask={asTask}
      editingPost={editingPost}
      canSubmit={canSubmit}
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

  const activeTopicName =
    activeTopic !== ""
      ? settings.topics.find((t) => t.id === activeTopic)?.title
      : undefined;

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
      {!settings.reverseOrder && renderInputArea}
      {!settings.reverseOrder && renderCountDisplay}

      <Box
        className="mfdi-scroll-container"
        flexGrow={1}
        overflowY="scroll"
        overflowX="hidden"
        display="flex"
        flexDirection={settings.reverseOrder ? "column-reverse" : "column"}
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
          />
        ) : (
          <PostListView
            app={app}
            filteredPosts={filteredPosts}
            editingPostOffset={editingPostOffset}
            settings={settings}
            granularity={granularity}
            handleClickTime={handleClickTime}
            startEdit={startEdit}
            deletePost={deletePost}
          />
        )}
      </Box>

      {settings.reverseOrder && renderCountDisplay}
      {settings.reverseOrder && renderInputArea}
    </Flex>
  );
};
