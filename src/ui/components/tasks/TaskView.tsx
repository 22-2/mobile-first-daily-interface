import { memo } from "react";
import { excludeWikiLink } from "src/core/strings";
import type { Task } from "src/core/task-text";
import { CardContent } from "src/ui/components/cards/BaseCard";
import { Card } from "src/ui/components/cards/Card";
import { ReadMoreContent } from "src/ui/components/cards/ReadMoreContent";
import { ObsidianMarkdown } from "src/ui/components/common/ObsidianMarkdown";
import { Box, Checkbox, HStack } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import type { Granularity, TimeFilter } from "src/ui/types";

export const TaskView = memo(
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
        <CardContent
          timestamp={task.timestamp}
          granularity={granularity}
          isDimmed={disabled}
          onContextMenu={(e) => onContextMenu?.(task, e)}
        >
          <ReadMoreContent text={excludeWikiLink(task.name)}>
            {(displayText) => (
              <HStack className={cn("items-start gap-[var(--size-2-1)]")}>
                <Checkbox
                  checked={task.mark !== " "}
                  onChange={(ev) => onChange(ev.target.checked)}
                  disabled={disabled}
                  className={cn(
                    "mt-[0.2em] w-4 h-4 cursor-pointer shrink-0 accent-[var(--color-accent)]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                />
                <Box className={cn("text-[93%] px-1 break-words flex-1")}>
                  <ObsidianMarkdown content={displayText} />
                </Box>
              </HStack>
            )}
          </ReadMoreContent>
        </CardContent>
      </Card>
    );
  },
);
