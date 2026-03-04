import { Box } from "@chakra-ui/react";
import * as React from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { TaskView } from "../TaskView";

interface TaskListViewProps {
  date: any;
  tasks: any[];
  updateTaskChecked: (task: any, checked: boolean) => void;
  taskContextMenu: (task: any, e: React.MouseEvent) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  date,
  tasks,
  updateTaskChecked,
  taskContextMenu,
}) => {
  const incompleteTasks = tasks.filter((x) => x.mark === " ");
  const completedTasks = tasks.filter((x) => x.mark !== " ");

  return (
    <>
      {incompleteTasks.length > 0 && (
        <TransitionGroup className="list" style={{ padding: "var(--size-4-4) 0" }}>
          {incompleteTasks.map((x) => (
            <CSSTransition
              key={date.format() + String(x.offset)}
              timeout={300}
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
        <TransitionGroup className="list" style={{ padding: "var(--size-4-4) 0" }}>
          {completedTasks.map((x) => (
            <CSSTransition
              key={date.format() + String(x.offset)}
              timeout={300}
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
};
