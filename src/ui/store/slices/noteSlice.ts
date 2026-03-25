import { Notice } from "obsidian";
import { createTopicNote } from "src/utils/daily-notes";
import {
  ensureFixedNote,
  resolveCurrentTargetNote
} from "src/utils/fixed-note";
import { StateCreator } from "zustand/vanilla";
import { MFDIStore, NoteSlice } from "./types";

export const createNoteSlice: StateCreator<MFDIStore, [], [], NoteSlice> = (
  set,
  get,
) => ({
  currentDailyNote: null,
  weekNotePaths: new Set(),

  setCurrentDailyNote: (currentDailyNote) => {
    set({ currentDailyNote });
  },

  updateCurrentDailyNote: (shell) => {
    const {
      granularity,
      activeTopic,
      getEffectiveDate,
      currentDailyNote,
      viewNoteMode,
      fixedNotePath,
    } = get();
    const note = resolveCurrentTargetNote({
      shell,
      date: getEffectiveDate(),
      granularity,
      activeTopic,
      noteMode: viewNoteMode,
      fixedNotePath,
    });
    if (note?.path !== currentDailyNote?.path) {
      set({ currentDailyNote: note });
    }
  },

  replacePaths: (weekNotePaths) => {
    set({ weekNotePaths });
  },

  addPaths: (paths) => {
    set((state) => {
      const next = new Set(state.weekNotePaths);
      paths.forEach((path) => next.add(path));
      return { weekNotePaths: next };
    });
  },

  clearPaths: () => {
    set({ weekNotePaths: new Set() });
  },

  createNoteWithInsertAfter: async (shell, settings, targetDate) => {
    const {
      granularity,
      activeTopic,
      getEffectiveDate,
      viewNoteMode,
      fixedNotePath,
    } = get();

    if (viewNoteMode === "fixed") {
      if (!fixedNotePath) return null;
      const fixedNote = await ensureFixedNote(shell, fixedNotePath);
      set({ currentDailyNote: fixedNote });
      return fixedNote;
    }

    const date = targetDate ?? getEffectiveDate();
    const existing = resolveCurrentTargetNote({
      shell,
      date,
      granularity,
      activeTopic,
      noteMode: "periodic",
      fixedNotePath: null,
    });
    if (existing) {
      set({ currentDailyNote: existing });
      return existing;
    }

    const created = await createTopicNote(shell, date, granularity, activeTopic);
    if (settings.insertAfter) {
      const content = await shell.readVaultFile(created);
      if (!content.includes(settings.insertAfter)) {
        await shell.modifyVaultFile(
          created,
          content
            ? `${content}\n${settings.insertAfter}`
            : settings.insertAfter,
        );
      }
    }

    set({ currentDailyNote: created });
    return created;
  },

  handleClickOpenDailyNote: async (shell, settings) => {
    const {
      granularity,
      activeTopic,
      getEffectiveDate,
      viewNoteMode,
      fixedNotePath,
    } = get();
    const targetDate = getEffectiveDate();
    let note = resolveCurrentTargetNote({
      shell,
      date: targetDate,
      granularity,
      activeTopic,
      noteMode: viewNoteMode,
      fixedNotePath,
    });

    if (!note) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      note = await get().createNoteWithInsertAfter(shell, settings, targetDate);
    }

    if (note) {
      set({ currentDailyNote: note });

      // 明示的にMarkdownビューとして開きたい場合はフラグを付与して
      // プラグイン側の setViewState パッチでの置換を回避する。
      const leaf = shell.getLeaf(true);
      await leaf.setViewState({
        type: "markdown",
        active: true,
        state: { file: note.path, __mfdi_force_markdown: true },
      });
    }
  },

  handleChangeTopic: (topicId) => {
    const { activeTopic, setActiveTopic, setPosts, setTasks } = get();
    if (activeTopic === topicId) return;
    setActiveTopic(topicId);
    set({ currentDailyNote: null });
    setPosts([]);
    setTasks([]);
  },
});
