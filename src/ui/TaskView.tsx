import { HStack } from "@chakra-ui/react";
import Markdown from "marked-react";
import * as React from "react";
import { Task } from "../app-helper";
import { excludeWikiLink } from "../utils/strings";
import { Card } from "./Card";

export const TaskView = ({
  task,
  onChange,
  onContextMenu,
}: {
  task: Task;
  onChange: (checked: boolean) => void;
  onContextMenu?: (task: Task, e: React.MouseEvent) => void;
}) => {
  return (
    <Card onContextMenu={(e) => onContextMenu?.(task, e)}>
      <HStack padding={3} gap={3}>
        <input
          type="checkbox"
          checked={task.mark !== " "}
          value={task.name}
          onChange={(ev) => onChange(ev.target.checked)}
        />
        <label>
          <Markdown gfm breaks isInline>
            {excludeWikiLink(task.name)}
          </Markdown>
        </label>
      </HStack>
    </Card>
  );
};
