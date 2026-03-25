import { Notice } from "obsidian";
import { useCallback } from "react";
import { Task } from "src/app-helper";
import { useAppContext } from "src/ui/context/AppContext";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

export const useTaskActions = () => {
  const { shell } = useAppContext();

  const isReadOnly = useSettingsStore((s) => s.isReadOnly());

  const noteState = useNoteStore(
    useShallow((s) => ({
      currentDailyNote: s.currentDailyNote,
    })),
  );

  const postsState = usePostsStore(
    useShallow((s) => ({
      tasks: s.tasks,
      setTasks: s.setTasks,
    })),
  );

  const updateTaskChecked = useCallback(
    async (task: Task, checked: boolean) => {
      if (isReadOnly) {
        new Notice("過去のノートのタスクは変更できません");
        return;
      }
      if (!noteState.currentDailyNote) return;
      const mark = checked ? "x" : " ";
      postsState.setTasks(
        postsState.tasks.map((x) =>
          x.offset === task.offset ? { ...x, mark } : x,
        ),
      );
      await shell.setCheckMark(
        noteState.currentDailyNote.path,
        mark,
        task.offset,
      );
    },
    [
      noteState.currentDailyNote,
      postsState.tasks,
      postsState.setTasks,
      shell,
      isReadOnly,
    ],
  );

  const openTaskInEditor = useCallback(
    (task: Task) => {
      (async () => {
        if (!noteState.currentDailyNote) return;
        const leaf = shell.getLeaf(true);
        await leaf.openFile(noteState.currentDailyNote);
        const editor = shell.getActiveMarkdownEditor()!;
        if (!editor) return;
        const pos = editor.offsetToPos(task.offset);
        editor.setCursor(pos);
        await leaf.openFile(noteState.currentDailyNote, {
          eState: { line: pos.line },
        });
      })();
    },
    [shell, noteState.currentDailyNote],
  );

  const deleteTask = useCallback(
    async (task: Task) => {
      if (isReadOnly) {
        new Notice("過去のノートのタスクは削除できません");
        return;
      }
      if (!noteState.currentDailyNote) return;
      const path = noteState.currentDailyNote.path;
      const origin = await shell.loadFile(path);
      let start = task.offset;
      let end = origin.indexOf("\n", start);
      if (end === -1) end = origin.length;
      else end += 1;
      await shell.replaceRange(path, start, end, "");
      let newContent = await shell.loadFile(path);
      newContent = newContent.replace(/\n{4,}/g, "\n\n\n");
      await shell.writeFile(path, newContent);
      postsState.setTasks(
        (await shell.getTasks(noteState.currentDailyNote)) ?? [],
      );
    },
    [shell, noteState.currentDailyNote, isReadOnly, postsState.setTasks],
  );

  return {
    updateTaskChecked,
    openTaskInEditor,
    deleteTask,
  };
};
