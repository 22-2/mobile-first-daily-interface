import { Box } from "@chakra-ui/react";
import { Menu } from "obsidian";
import { memo, useCallback, useMemo } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { TaskView } from "src/ui/components/tasks/TaskView";
import { useTaskActions } from "src/ui/hooks/internal/useTaskActions";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

export const TaskListView: React.FC = memo(() => {
  const { confirmDeleteAction } = useObsidianUi();
  const { date, granularity, timeFilter, isReadOnly } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      granularity: s.granularity,
      timeFilter: s.timeFilter,
      isReadOnly: s.isReadOnly(),
    })),
  );

  const { tasks } = usePostsStore(
    useShallow((s) => ({
      tasks: s.tasks,
    })),
  );

  const { updateTaskChecked, openTaskInEditor, deleteTask } = useTaskActions();

  const showTaskContextMenu = useCallback(
    (task: (typeof tasks)[number], e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const menu = new Menu();
      menu.addItem((item) =>
        item.setTitle("タスクにジャンプ").onClick(() => openTaskInEditor(task)),
      );
      menu.addItem((item) =>
        item.setTitle("編集").onClick(() => openTaskInEditor(task)),
      );
      menu.addItem((item) =>
        item
          .setTitle("削除")
          .setDisabled(isReadOnly)
          .onClick(() => {
            confirmDeleteAction(() => deleteTask(task));
          }),
      );
      menu.showAtMouseEvent(e as unknown as MouseEvent);
    },
    [confirmDeleteAction, deleteTask, isReadOnly, openTaskInEditor, tasks],
  );

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
