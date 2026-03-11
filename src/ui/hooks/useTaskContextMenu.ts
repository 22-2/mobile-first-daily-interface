import { Menu } from "obsidian";
import { useCallback } from "react";
import { Task } from "src/app-helper";
import { useAppContext } from "src/ui/context/AppContext";
import { useMFDIContext } from "src/ui/context/MFDIAppContext";
import { DeleteConfirmModal } from "src/ui/modals/DeleteConfirmModal";

export const useTaskContextMenu = () => {
  const { app } = useAppContext();
  const { isReadOnly, openTaskInEditor, deleteTask } = useMFDIContext();

  const showTaskContextMenu = useCallback(
    (task: Task, e: React.MouseEvent) => {
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
            new DeleteConfirmModal(app, () => deleteTask(task)).open();
          }),
      );
      menu.showAtMouseEvent(e as unknown as MouseEvent);
    },
    [app, openTaskInEditor, deleteTask, isReadOnly],
  );

  return { showTaskContextMenu };
};
