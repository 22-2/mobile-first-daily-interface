import { Box, HStack } from "@chakra-ui/react";
import { Menu } from "obsidian";
import * as React from "react";
import { granularityConfig } from "../granularity-config";
import { Granularity, MomentLike } from "../types";

import { useAppContext } from "../context/AppContext";
import { addGranularityMenuItems } from "../menus/granularityMenu";
import { UnderlinedClickable } from "./UnderlinedClickable";

interface CountDisplayProps {
  date: MomentLike;
  granularity: Granularity;
  asTask: boolean;
  tasksCount: number;
  filteredPostsCount: number;
  allPostsCount: number;
  timeFilter: string | number;
  activeTopicName?: string;
  onTopicChange?: (topicId: string) => void;
  onGranularityChange?: (granularity: Granularity) => void;
}

export const CountDisplay: React.FC<CountDisplayProps> = ({
  date,
  granularity,
  asTask,
  tasksCount,
  filteredPostsCount,
  allPostsCount,
  timeFilter,
  activeTopicName,
  onTopicChange,
  onGranularityChange,
}) => {
  const { settings } = useAppContext();
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
        {asTask ? (
          `${tasksCount} tasks`
        ) : (
          <>
            {filteredPostsCount}
            {(timeFilter !== "all" && timeFilter !== "this_week") && granularity === "day"
              ? `/${allPostsCount}`
              : ""}
            {timeFilter === "this_week" ? " (今週)" : ""}{" "}
            posts
            {activeTopicName && (
              <>
                {" in "}
                <UnderlinedClickable
                  onContextMenu={(e: React.MouseEvent) => {
                    if (!topics || !onTopicChange) return;
                    e.preventDefault();
                    const menu = new Menu();
                    topics.forEach((topic) => {
                      menu.addItem((item) =>
                        item
                          .setTitle(topic.title)
                          .setChecked(topic.title === activeTopicName)
                          .onClick(() => onTopicChange(topic.id))
                      );
                    });
                    menu.showAtMouseEvent(e as unknown as MouseEvent);
                  }}
                >
                  {activeTopicName}
                </UnderlinedClickable>
              </>
            )}
          </>
        )}
      </Box>
    </HStack>
  );
};
