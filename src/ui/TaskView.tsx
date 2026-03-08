import { HStack } from "@chakra-ui/react";
import { ObsidianMarkdown } from "./components/ObsidianMarkdown";
import * as React from "react";
import { Task } from "../app-helper";
import { excludeWikiLink } from "../utils/strings";
import { Card } from "./Card";

export const TaskView = React.memo(
  ({
    task,
    onChange,
    onContextMenu,
    disabled = false,
  }: {
    task: Task;
    onChange: (checked: boolean) => void;
    onContextMenu?: (task: Task, e: React.MouseEvent) => void;
    disabled?: boolean;
  }) => {
    return (
      <Card onContextMenu={(e) => onContextMenu?.(task, e)}>
        <HStack padding={3} gap={3} opacity={disabled ? 0.6 : 1}>
          <input
            type="checkbox"
            checked={task.mark !== " "}
            value={task.name}
            onChange={(ev) => onChange(ev.target.checked)}
            disabled={disabled}
            style={{ cursor: disabled ? "not-allowed" : "pointer" }}
          />
          <label style={{ cursor: disabled ? "not-allowed" : "pointer" }}>
            <ObsidianMarkdown
              content={excludeWikiLink(task.name)}
              sourcePath={task.path}
              inline
            />
          </label>
        </HStack>
      </Card>
    );
  }
);
