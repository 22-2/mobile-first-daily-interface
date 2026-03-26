import { Notice } from "obsidian";
import { resolveNoteSource } from "src/core/note-source";
import { MFDIStore, NoteSlice } from "src/ui/store/slices/types";
import { StateCreator } from "zustand/vanilla";

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
    const noteSource = resolveNoteSource({
      shell,
      date: getEffectiveDate(),
      granularity,
      activeTopic,
      noteMode: viewNoteMode,
      fixedNotePath,
    });
    const note = noteSource.resolveCurrentNote();
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
    const date = targetDate ?? getEffectiveDate();
    const noteSource = resolveNoteSource({
      shell,
      date,
      granularity,
      activeTopic,
      noteMode: viewNoteMode,
      fixedNotePath,
    });
    const note =
      noteSource.resolveCurrentNote() ?? (await noteSource.ensureCurrentNote());
    if (!note) return null;

    if (noteSource.mode === "periodic" && settings.insertAfter) {
      const content = await shell.readVaultFile(note);
      if (!content.includes(settings.insertAfter)) {
        await shell.modifyVaultFile(
          note,
          content
            ? `${content}\n${settings.insertAfter}`
            : settings.insertAfter,
        );
      }
    }

    set({ currentDailyNote: note });
    return note;
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
    const noteSource = resolveNoteSource({
      shell,
      date: targetDate,
      granularity,
      activeTopic,
      noteMode: viewNoteMode,
      fixedNotePath,
    });
    let note = noteSource.resolveCurrentNote();

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
