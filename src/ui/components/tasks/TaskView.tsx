import { Box, Checkbox, HStack } from "@chakra-ui/react";
import { Task } from "src/app-helper";
import { BaseCard } from "src/ui/components/BaseCard";
import { Card } from "src/ui/components/cards/Card";
import { ObsidianMarkdown } from "src/ui/components/ObsidianMarkdown";
import { Granularity, TimeFilter } from "src/ui/types";
import { excludeWikiLink } from "src/utils/strings";

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
            <Box
              fontSize={"93%"}
              paddingX={1}
              wordBreak={"break-word"}
              flex="1"
            >
              <ObsidianMarkdown
                content={excludeWikiLink(task.name)}
                sourcePath={task.path}
              />
            </Box>
          </HStack>
        </BaseCard>
      </Card>
    );
  },
);
