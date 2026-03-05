import { Box } from "@chakra-ui/react";
import * as React from "react";
import { useMemo } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { TaskView } from "../TaskView";

import { Task } from "../../app-helper";
import { MomentLike } from "../types";

interface TaskListViewProps {
  date: MomentLike;
  tasks: Task[];
  updateTaskChecked: (task: Task, checked: boolean) => void;
  taskContextMenu: (task: Task, e: React.MouseEvent) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = React.memo(
  ({ date, tasks, updateTaskChecked, taskContextMenu }) => {
    const incompleteTasks = useMemo(
      () => tasks.filter((x) => x.mark === " "),
      [tasks]
    );
    const completedTasks = useMemo(
      () => tasks.filter((x) => x.mark !== " "),
      [tasks]
    );

    return (
      <>
        {incompleteTasks.length > 0 && (
          <TransitionGroup
            className="list"
            style={{ padding: "var(--size-4-4) 0" }}
          >
            {incompleteTasks.map((x) => (
              <CSSTransition
                key={date.format() + String(x.offset)}
                timeout={100}
                classNames="item"
              >
                <Box m={10}>
                  <TaskView
                    task={x}
                    onChange={(c) => updateTaskChecked(x, c)}
                    onContextMenu={(task, e) => taskContextMenu(task, e)}
                  />
                </Box>
              </CSSTransition>
            ))}
          </TransitionGroup>
        )}
        {completedTasks.length > 0 && (
          <TransitionGroup
            className="list"
            style={{ padding: "var(--size-4-4) 0" }}
          >
            {completedTasks.map((x) => (
              <CSSTransition
                key={date.format() + String(x.offset)}
                timeout={100}
                classNames="item"
              >
                <Box m={10}>
                  <TaskView
                    task={x}
                    onChange={(c) => updateTaskChecked(x, c)}
                    onContextMenu={(task, e) => taskContextMenu(task, e)}
                  />
                </Box>
              </CSSTransition>
            ))}
          </TransitionGroup>
        )}
      </>
    );
  }
);

