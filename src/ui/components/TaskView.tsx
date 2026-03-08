import { Box, Checkbox, HStack } from "@chakra-ui/react";
import * as React from "react";
import { Task } from "../../app-helper";
import { excludeWikiLink } from "../../utils/strings";
import { Granularity, TimeFilter } from "../types";
import { BaseCard } from "./BaseCard";
import { Card } from "./cards/Card";
import { ObsidianMarkdown } from "./ObsidianMarkdown";

export const TaskView = React.memo(
  ({
    task,
    granularity,
    timeFilter,
    onChange,
    onContextMenu,
    disabled = false,
  }: {
    task: Task;
    granularity: Granularity;
    timeFilter?: TimeFilter;
    onChange: (checked: boolean) => void;
    onContextMenu?: (task: Task, e: React.MouseEvent) => void;
    disabled?: boolean;
  }) => {
    return (
      <Card>
        <BaseCard
          timestamp={task.timestamp}
          granularity={granularity}
          timeFilter={timeFilter}
          isDimmed={disabled}
          onContextMenu={(e) => onContextMenu?.(task, e)}
        >
          <HStack align="flex-start" gap={3}>
            <Checkbox
              isChecked={task.mark !== " "}
              onChange={(ev) => onChange(ev.target.checked)}
              isDisabled={disabled}
              colorScheme="blue"
              marginTop="0.2em"
              size="md"
            />
            <Box fontSize={"93%"} paddingX={1} wordBreak={"break-word"} flex="1">
              <ObsidianMarkdown
                content={excludeWikiLink(task.name)}
                sourcePath={task.path}
              />
            </Box>
          </HStack>
        </BaseCard>
      </Card>
    );
  }
);
