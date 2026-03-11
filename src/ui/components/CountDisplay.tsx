import { Box, HStack } from "@chakra-ui/react";
import { Menu } from "obsidian";
import * as React from "react";
import { granularityConfig } from "src/ui/config/granularity-config";

import { UnderlinedClickable } from "src/ui/components/UnderlinedClickable";
import { useAppContext } from "src/ui/context/AppContext";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useShallow } from "zustand/shallow";
import { addPeriodMenuItems } from "src/ui/menus/periodMenu";
import { addPostModeMenuItems } from "src/ui/menus/postModeMenu";

const DateSection: React.FC = () => {
  const { date, granularity, dateFilter, displayMode } = useSettingsStore(useShallow(s => ({
    date: s.date,
    granularity: s.granularity,
    dateFilter: s.dateFilter,
    displayMode: s.displayMode,
  })));
  const onClick = useFilterMenu();

  if (displayMode === "timeline") return null;

  const dateLabel = React.useMemo(() => {
    if (granularity !== "day" || dateFilter === "today") {
      return date.format(granularityConfig[granularity].displayFormat);
    }

    const format = granularityConfig.day.displayFormat;
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
    return date.format(granularityConfig[granularity].displayFormat);
  }, [date, granularity, dateFilter]);

  return (
    <Box>
      <UnderlinedClickable onClick={onClick}>
        {dateLabel}
      </UnderlinedClickable>
    </Box>
  );
};

const usePostModeMenu = () => {
  const { asTask, setAsTask: onAsTaskChange } = useSettingsStore(useShallow(s => ({
    asTask: s.asTask,
    setAsTask: s.setAsTask
  })));

  return (e: React.MouseEvent) => {
    if (!onAsTaskChange) return;
    e.preventDefault();
    const menu = new Menu();
    addPostModeMenuItems(menu, asTask, onAsTaskChange);
    menu.showAtMouseEvent(e as unknown as MouseEvent);
  };
};

const useFilterMenu = () => {
  const state = useSettingsStore(useShallow(s => ({
    granularity: s.granularity,
    date: s.date,
    timeFilter: s.timeFilter,
    dateFilter: s.dateFilter,
    displayMode: s.displayMode,
    asTask: s.asTask,
    activeTopic: s.activeTopic,
    setTimeFilter: s.setTimeFilter,
    setDateFilter: s.setDateFilter,
  })));
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
  const settings = useSettingsStore(useShallow(s => ({
    granularity: s.granularity,
    asTask: s.asTask,
    dateFilter: s.dateFilter,
    timeFilter: s.timeFilter,
    displayMode: s.displayMode,
  })));
  const postsState = usePostsStore(useShallow(s => ({
    posts: s.posts,
    tasks: s.tasks,
  })));
  const filteredPosts = useFilteredPosts({
    posts: postsState.posts,
    ...settings,
  });
  const { granularity, asTask, dateFilter, timeFilter, displayMode } = settings;
  const { posts, tasks } = postsState;
  const onClick = usePostModeMenu();

  const tasksCount = tasks.length;
  const filteredPostsCount = filteredPosts.length;
  const allPostsCount = posts.length;

  const showTotal =
    (dateFilter === "today" && timeFilter !== "all" && granularity === "day") || displayMode === "timeline";
  const totalPart = showTotal ? `/${allPostsCount}` : "";

  return (
    <UnderlinedClickable onClick={onClick}>
      {asTask ? `${tasksCount} tasks` : `${filteredPostsCount}${totalPart} posts`}
    </UnderlinedClickable>
  );
};

const TopicSection: React.FC = () => {
  const { settings } = useAppContext();
  const { activeTopic, setActiveTopic: onTopicChange } = useSettingsStore(useShallow(s => ({
    activeTopic: s.activeTopic,
    setActiveTopic: s.setActiveTopic,
  })));

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

