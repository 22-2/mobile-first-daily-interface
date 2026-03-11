import { Box } from "@chakra-ui/react";
import * as React from "react";
import { useMemo } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { TaskView } from "src/ui/components/tasks/TaskView";
import { useMFDIContext } from "src/ui/context/MFDIAppContext";
import { useTaskContextMenu } from "src/ui/hooks/useTaskContextMenu";

export const TaskListView: React.FC = React.memo(() => {
  const {
    date,
    tasks,
    granularity,
    timeFilter,
    updateTaskChecked,
    isReadOnly,
  } = useMFDIContext();

  const { showTaskContextMenu } = useTaskContextMenu();

  const incompleteTasks = useMemo(
    () => tasks.filter((x) => x.mark === " "),
    [tasks],
  );
  const completedTasks = useMemo(
    () => tasks.filter((x) => x.mark !== " "),
    [tasks],
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
                  onContextMenu={showTaskContextMenu}
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
                  onContextMenu={showTaskContextMenu}
                  disabled={isReadOnly}
                />
              </Box>
            </CSSTransition>
          ))}
        </TransitionGroup>
      )}
    </>
  );
});
