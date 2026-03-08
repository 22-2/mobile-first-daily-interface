import { Box, HStack } from "@chakra-ui/react";
import { Menu } from "obsidian";
import * as React from "react";
import {
  DATE_FILTER_OPTIONS,
  TIME_FILTER_OPTIONS,
} from "../config/filter-config";
import { granularityConfig } from "../config/granularity-config";
import { Granularity } from "../types";

import { useAppContext } from "../context/AppContext";
import { useMFDIContext } from "../context/MFDIAppContext";
import { addGranularityMenuItems } from "../menus/granularityMenu";
import { addPeriodMenuItems } from "../menus/periodMenu";
import { UnderlinedClickable } from "./UnderlinedClickable";

const DateSection: React.FC = () => {
  const { date, granularity, setGranularity: onGranularityChange } =
    useMFDIContext();

  const unitMap: Record<Granularity, string> = {
    day: "日",
    week: "週間",
    month: "ヶ月",
    year: "年",
  };
  const unit = granularityConfig[granularity].unit;
  const now = window.moment().startOf(unit);
  const current = date.clone().startOf(unit);
  const diff = current.diff(now, unit);
  const relativeText =
    diff !== 0
      ? ` (${Math.abs(diff)}${unitMap[granularity]}${diff > 0 ? "後" : "前"})`
      : "";

  return (
    <Box>
      <UnderlinedClickable
        onContextMenu={(e: React.MouseEvent) => {
          e.preventDefault();
          const menu = new Menu();
          addGranularityMenuItems(menu, granularity, onGranularityChange);
          menu.showAtMouseEvent(e as unknown as MouseEvent);
        }}
      >
        {date.format(granularityConfig[granularity].displayFormat)}
      </UnderlinedClickable>
      {relativeText}
    </Box>
  );
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
  const onContextMenu = useFilterMenu();

  const tasksCount = tasks.length;
  const filteredPostsCount = filteredPosts.length;
  const allPostsCount = posts.length;

  const showTotal =
    dateFilter === "today" && timeFilter !== "all" && granularity === "day";
  const totalPart = showTotal ? `/${allPostsCount}` : "";

  return (
    <UnderlinedClickable onContextMenu={onContextMenu}>
      {asTask ? `${tasksCount} tasks` : `${filteredPostsCount}${totalPart} posts`}
    </UnderlinedClickable>
  );
};

const FilterSuffix: React.FC = () => {
  const { granularity, asTask, timeFilter, dateFilter } = useMFDIContext();
  const onContextMenu = useFilterMenu();

  if (asTask) return null;

  const dateFilterLabel = DATE_FILTER_OPTIONS.find(
    (f) => f.id === dateFilter,
  )?.label.replace("過去", "");

  let suffix = "";
  if (dateFilter !== "today") {
    suffix = ` (${dateFilterLabel})`;
  } else if (timeFilter === "latest") {
    suffix = " (最新)";
  } else if (timeFilter !== "all") {
    suffix = ` (${timeFilter})`;
  }

  if (!suffix) return null;

  return (
    <UnderlinedClickable onContextMenu={onContextMenu}>
      {suffix}
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
        onContextMenu={(e: React.MouseEvent) => {
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
        <FilterSuffix />
      </Box>
    </HStack>
  );
};

