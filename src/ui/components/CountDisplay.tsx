import { Box, HStack } from "@chakra-ui/react";
import { Menu } from "obsidian";
import * as React from "react";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";

import { UnderlinedClickable } from "src/ui/components/UnderlinedClickable";
import { useAppContext } from "src/ui/context/AppContext";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { addGranularityMenuItems } from "src/ui/menus/granularityMenu";
import { addPeriodMenuItems } from "src/ui/menus/periodMenu";
import { addPostModeMenuItems } from "src/ui/menus/postModeMenu";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { countVisibleRootPosts } from "src/ui/utils/thread-utils";
import { isTimelineView } from "src/ui/utils/view-mode";
import { getFixedNoteTitle, getMFDIViewCapabilities } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

const DateSection: React.FC = () => {
  const { date, granularity, dateFilter, displayMode, viewNoteMode } =
    useSettingsStore(
      useShallow((s) => ({
        date: s.date,
        granularity: s.granularity,
        dateFilter: s.dateFilter,
        displayMode: s.displayMode,
        viewNoteMode: s.viewNoteMode,
      })),
    );
  const onClick = useFilterMenu();
  const onContextMenu = useGranularityMenu();
  const capabilities = React.useMemo(
    () => getMFDIViewCapabilities({ noteMode: viewNoteMode }),
    [viewNoteMode],
  );

  if (isTimelineView(displayMode) || !capabilities.supportsDateNavigation)
    return null;

  const dateLabel = React.useMemo(() => {
    if (granularity !== "day" || dateFilter === "today") {
      return date.format(GRANULARITY_CONFIG[granularity].displayFormat);
    }

    const format = GRANULARITY_CONFIG.day.displayFormat;
    if (dateFilter === "this_week") {
      const start = date.clone().startOf("isoWeek");
      const end = date.clone().endOf("isoWeek");
      return `${start.format(format)} - ${end.format(format)}`;
    }

    const days = parseInt(dateFilter);
    if (!isNaN(days)) {
      const start = date.clone().subtract(days - 1, "days");
      const end = date.clone();
      return `${start.format(format)} - ${end.format(format)}`;
    }
    return date.format(GRANULARITY_CONFIG[granularity].displayFormat);
  }, [date, granularity, dateFilter]);

  return (
    <Box>
      <UnderlinedClickable onClick={onClick} onContextMenu={onContextMenu}>
        {dateLabel}
      </UnderlinedClickable>
    </Box>
  );
};

const usePostModeMenu = () => {
  const { asTask, setAsTask: onAsTaskChange } = useSettingsStore(
    useShallow((s) => ({
      asTask: s.asTask,
      setAsTask: s.setAsTask,
    })),
  );

  return (e: React.MouseEvent) => {
    if (!onAsTaskChange) return;
    e.preventDefault();
    const menu = new Menu();
    addPostModeMenuItems(menu, asTask, onAsTaskChange);
    menu.showAtMouseEvent(e as unknown as MouseEvent);
  };
};

const useGranularityMenu = () => {
  const { granularity, setGranularity } = useSettingsStore(
    useShallow((s) => ({
      granularity: s.granularity,
      setGranularity: s.setGranularity,
    })),
  );

  return (e: React.MouseEvent) => {
    if (!setGranularity) return;
    e.preventDefault();
    const menu = new Menu();
    addGranularityMenuItems(menu, granularity, (g) => setGranularity(g));
    menu.showAtMouseEvent(e as unknown as MouseEvent);
  };
};

const useFilterMenu = () => {
  const state = useSettingsStore(
    useShallow((s) => ({
      granularity: s.granularity,
      date: s.date,
      timeFilter: s.timeFilter,
      dateFilter: s.dateFilter,
      displayMode: s.displayMode,
      asTask: s.asTask,
      activeTopic: s.activeTopic,
      setTimeFilter: s.setTimeFilter,
      setDateFilter: s.setDateFilter,
    })),
  );
  const { setTimeFilter, setDateFilter } = state;

  return (e: React.MouseEvent) => {
    e.preventDefault();
    const menu = new Menu();
    addPeriodMenuItems(menu, state, {
      onChangeTimeFilter: (f) => setTimeFilter?.(f),
      onChangeDateFilter: (f) => setDateFilter?.(f),
    });
    menu.showAtMouseEvent(e as unknown as MouseEvent);
  };
};

const CountSection: React.FC = () => {
  const settings = useSettingsStore(
    useShallow((s) => ({
      granularity: s.granularity,
      asTask: s.asTask,
      dateFilter: s.dateFilter,
      timeFilter: s.timeFilter,
      displayMode: s.displayMode,
      threadFocusRootId: s.threadFocusRootId,
      viewNoteMode: s.viewNoteMode,
      fixedNotePath: s.fixedNotePath,
    })),
  );
  const postsState = usePostsStore(
    useShallow((s) => ({
      posts: s.posts,
      tasks: s.tasks,
    })),
  );
  const filteredPosts = useFilteredPosts({
    posts: postsState.posts,
    ...settings,
  });
  const {
    granularity,
    asTask,
    dateFilter,
    timeFilter,
    displayMode,
    viewNoteMode,
    fixedNotePath,
  } = settings;
  const { posts, tasks } = postsState;
  const onClick = usePostModeMenu();

  const tasksCount = tasks.length;
  const filteredPostsCount = filteredPosts.length;
  const allPostsCount = countVisibleRootPosts(
    posts.filter((post) => !post.metadata.archived && !post.metadata.deleted),
  );

  const showTotal =
    (dateFilter === "today" && timeFilter !== "all" && granularity === "day") ||
    isTimelineView(displayMode);
  const totalPart = showTotal ? `/${allPostsCount}` : "";

  if (viewNoteMode === "fixed") {
    return (
      <UnderlinedClickable onClick={onClick}>
        {asTask
          ? `${tasksCount} tasks in ${getFixedNoteTitle(fixedNotePath)}`
          : `${filteredPostsCount} posts in ${getFixedNoteTitle(fixedNotePath)}`}
      </UnderlinedClickable>
    );
  }

  return (
    <UnderlinedClickable onClick={onClick}>
      {asTask
        ? `${tasksCount} tasks`
        : `${filteredPostsCount}${totalPart} posts`}
    </UnderlinedClickable>
  );
};

const TopicSection: React.FC = () => {
  const { settings } = useAppContext();
  const {
    activeTopic,
    setActiveTopic: onTopicChange,
    viewNoteMode,
  } = useSettingsStore(
    useShallow((s) => ({
      activeTopic: s.activeTopic,
      setActiveTopic: s.setActiveTopic,
      viewNoteMode: s.viewNoteMode,
    })),
  );

  if (viewNoteMode === "fixed") return null;

  const activeTopicName = settings.topics.find(
    (t) => t.id === activeTopic,
  )?.title;
  const topics = settings.topics;

  if (!activeTopicName) return null;

  return (
    <>
      {" in "}
      <UnderlinedClickable
        onClick={(e: React.MouseEvent) => {
          if (!topics || !onTopicChange) return;
          e.preventDefault();
          const menu = new Menu();
          menu.addSeparator();
          menu.addItem((item) => {
            item.setTitle("トピック").setIcon("tag").setDisabled(true);
          });
          topics
            .filter((t) => !t.archived)
            .forEach((topic) => {
              menu.addItem((item) =>
                item
                  .setTitle(topic.title)
                  .setChecked(topic.title === activeTopicName)
                  .onClick(() => onTopicChange(topic.id)),
              );
            });
          menu.showAtMouseEvent(e as unknown as MouseEvent);
        }}
      >
        {activeTopicName}
      </UnderlinedClickable>
    </>
  );
};

export const CountDisplay: React.FC = () => {
  return (
    <HStack
      fontSize="var(--font-ui-smaller)"
      color="var(--text-muted)"
      marginX="var(--size-4-4)"
      marginY="var(--size-4-2)"
      opacity={0.8}
      spacing={0}
      justifyContent="space-between"
    >
      <DateSection />
      <Box>
        <CountSection />
        <TopicSection />
      </Box>
    </HStack>
  );
};
