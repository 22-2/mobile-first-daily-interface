import { Notice, TFile } from "obsidian";
import { useCallback } from "react";
import { Task } from "src/app-helper";

interface UseTaskActionsProps {
  app: any;
  appHelper: any;
  currentDailyNote: TFile | null;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  isReadOnly: boolean;
}

export const useTaskActions = ({
  app,
  appHelper,
  currentDailyNote,
  tasks,
  setTasks,
  isReadOnly,
}: UseTaskActionsProps) => {

  const updateTaskChecked = useCallback(
    async (task: Task, checked: boolean) => {
      if (isReadOnly) {
        new Notice("過去のノートのタスクは変更できません");
        return;
      }
      if (!currentDailyNote) return;
      const mark = checked ? "x" : " ";
      setTasks(
        tasks.map((x) => (x.offset === task.offset ? { ...x, mark } : x)),
      );
      await appHelper.setCheckMark(currentDailyNote.path, mark, task.offset);
    },
    [currentDailyNote, tasks, setTasks, appHelper, isReadOnly],
  );

  const openTaskInEditor = useCallback((task: Task) => {
    (async () => {
      if (!currentDailyNote) return;
      const leaf = app.workspace.getLeaf(true);
      await leaf.openFile(currentDailyNote);
      const editor = appHelper.getActiveMarkdownEditor()!;
      if (!editor) return;
      const pos = editor.offsetToPos(task.offset);
      editor.setCursor(pos);
      await leaf.openFile(currentDailyNote, {
        eState: { line: pos.line },
      });
    })();
  }, [app.workspace, appHelper, currentDailyNote]);

  const deleteTask = useCallback(async (task: Task) => {
    if (isReadOnly) {
      new Notice("過去のノートのタスクは削除できません");
      return;
    }
    if (!currentDailyNote) return;
    const path = currentDailyNote.path;
    const origin = await appHelper.loadFile(path);
    let start = task.offset;
    let end = origin.indexOf("\n", start);
    if (end === -1) end = origin.length;
    else end += 1;
    await appHelper.replaceRange(path, start, end, "");
    let newContent = await appHelper.loadFile(path);
    newContent = newContent.replace(/\n{4,}/g, "\n\n\n");
    await app.vault.adapter.write(path, newContent);
    setTasks((await appHelper.getTasks(currentDailyNote)) ?? []);
  }, [app.vault.adapter, appHelper, currentDailyNote, isReadOnly, setTasks]);

  return {
    updateTaskChecked,
    openTaskInEditor,
    deleteTask,
  };
};
