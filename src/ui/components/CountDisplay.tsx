import { Box, HStack } from "@chakra-ui/react";
import { Menu } from "obsidian";
import * as React from "react";
import { granularityConfig } from "../config/granularity-config";

import { useAppContext } from "../context/AppContext";
import { useMFDIContext } from "../context/MFDIAppContext";
import { addPeriodMenuItems } from "../menus/periodMenu";
import { addPostModeMenuItems } from "../menus/postModeMenu";
import { UnderlinedClickable } from "./UnderlinedClickable";

const DateSection: React.FC = () => {
  const { date, granularity, dateFilter } = useMFDIContext();
  const onClick = useFilterMenu();

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
  const { asTask, setAsTask: onAsTaskChange } = useMFDIContext();

  return (e: React.MouseEvent) => {
    if (!onAsTaskChange) return;
    e.preventDefault();
    const menu = new Menu();
    addPostModeMenuItems(menu, asTask, onAsTaskChange);
    menu.showAtMouseEvent(e as unknown as MouseEvent);
  };
};

const useFilterMenu = () => {
  const state = useMFDIContext();
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
  const { granularity, asTask, tasks, filteredPosts, posts, dateFilter, timeFilter } =
    useMFDIContext();
  const onClick = usePostModeMenu();

  const tasksCount = tasks.length;
  const filteredPostsCount = filteredPosts.length;
  const allPostsCount = posts.length;

  const showTotal =
    dateFilter === "today" && timeFilter !== "all" && granularity === "day";
  const totalPart = showTotal ? `/${allPostsCount}` : "";

  return (
    <UnderlinedClickable onClick={onClick}>
      {asTask ? `${tasksCount} tasks` : `${filteredPostsCount}${totalPart} posts`}
    </UnderlinedClickable>
  );
};

const TopicSection: React.FC = () => {
  const { settings } = useAppContext();
  const { activeTopic, setActiveTopic: onTopicChange } = useMFDIContext();

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

