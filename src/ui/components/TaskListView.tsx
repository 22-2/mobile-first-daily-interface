import { Box } from "@chakra-ui/react";
import * as React from "react";
import { useMemo } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { TaskView } from "../TaskView";

import { Task } from "../../app-helper";
import { Granularity, MomentLike, TimeFilter } from "../types";

interface TaskListViewProps {
  date: MomentLike;
  tasks: Task[];
  granularity: Granularity;
  timeFilter: TimeFilter;
  updateTaskChecked: (task: Task, checked: boolean) => void;
  taskContextMenu: (task: Task, e: React.MouseEvent) => void;
  isToday: boolean;
  isReadOnly: boolean;
}

export const TaskListView: React.FC<TaskListViewProps> = React.memo(
  ({ date, tasks, granularity, timeFilter, updateTaskChecked, taskContextMenu, isToday, isReadOnly }) => {
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
                    granularity={granularity}
                    timeFilter={timeFilter}
                    onChange={(c) => updateTaskChecked(x, c)}
                    onContextMenu={(task, e) => taskContextMenu(task, e)}
                    disabled={isReadOnly}
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
                    granularity={granularity}
                    timeFilter={timeFilter}
                    onChange={(c) => updateTaskChecked(x, c)}
                    onContextMenu={(task, e) => taskContextMenu(task, e)}
                    disabled={isReadOnly}
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
