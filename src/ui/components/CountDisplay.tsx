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
import { addPostModeMenuItems } from "../menus/postModeMenu";
import { UnderlinedClickable } from "./UnderlinedClickable";

export const CountDisplay: React.FC = () => {
  const { settings } = useAppContext();
  const {
    date,
    granularity,
    asTask,
    tasks,
    filteredPosts,
    posts,
    timeFilter,
    dateFilter,
    activeTopic,
    setActiveTopic: onTopicChange,
    setGranularity: onGranularityChange,
    setTimeFilter: onTimeFilterChange,
    setDateFilter: onDateFilterChange,
    setAsTask: onAsTaskChange,
  } = useMFDIContext();

  const activeTopicName = settings.topics.find(
    (t) => t.id === activeTopic,
  )?.title;
  const tasksCount = tasks.length;
  const filteredPostsCount = filteredPosts.length;
  const allPostsCount = posts.length;

  const topics = settings.topics;
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
    <HStack
      fontSize="var(--font-ui-smaller)"
      color="var(--text-muted)"
      marginX="var(--size-4-4)"
      marginY="var(--size-4-2)"
      opacity={0.8}
      spacing={0}
      justifyContent="space-between"
    >
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
      <Box>
        <UnderlinedClickable
          onContextMenu={(e: React.MouseEvent) => {
            if (!onAsTaskChange) return;
            e.preventDefault();
            const menu = new Menu();

            // モード切替
            addPostModeMenuItems(menu, asTask, onAsTaskChange);

            if (!asTask && granularity === "day") {
              // 期間（日）
              menu.addSeparator();
              DATE_FILTER_OPTIONS.forEach((f) => {
                menu.addItem((item) =>
                  item
                    .setTitle(f.label)
                    .setChecked(dateFilter === f.id)
                    .onClick(() => onDateFilterChange?.(f.id)),
                );
              });

              // 期間（時間）
              menu.addSeparator();
              TIME_FILTER_OPTIONS.forEach((f) => {
                menu.addItem((item) =>
                  item
                    .setTitle(f.label)
                    .setChecked(timeFilter === f.id && dateFilter === "today")
                    .setDisabled(dateFilter !== "today")
                    .onClick(() => onTimeFilterChange?.(f.id)),
                );
              });
            }

            menu.showAtMouseEvent(e as unknown as MouseEvent);
          }}
        >
          {asTask ? (
            `${tasksCount} tasks`
          ) : (
            <>
              {filteredPostsCount}
              {dateFilter === "today" &&
              timeFilter !== "all" &&
              granularity === "day"
                ? `/${allPostsCount}`
                : ""}
              {dateFilter !== "today" ? ` (${DATE_FILTER_OPTIONS.find(f => f.id === dateFilter)?.label.replace("過去", "")})` : ""}
              {dateFilter === "today" &&
              timeFilter !== "all" &&
              timeFilter !== "latest"
                ? ` (${timeFilter})`
                : ""}
              {dateFilter === "today" && timeFilter === "latest"
                ? " (最新)"
                : ""}{" "}
              posts
            </>
          )}
        </UnderlinedClickable>
        {activeTopicName && (
          <>
            {" in "}
            <UnderlinedClickable
              onContextMenu={(e: React.MouseEvent) => {
                if (!topics || !onTopicChange) return;
                e.preventDefault();
                const menu = new Menu();
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
        )}
      </Box>
    </HStack>
  );
};
