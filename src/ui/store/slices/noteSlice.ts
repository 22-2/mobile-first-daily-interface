import { Notice } from "obsidian";
import { createTopicNote } from "src/utils/daily-notes";
import {
  ensureFixedNote,
  resolveCurrentTargetNote,
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

  updateCurrentDailyNote: (app) => {
    const {
      granularity,
      activeTopic,
      getEffectiveDate,
      currentDailyNote,
      viewNoteMode,
      fixedNotePath,
    } = get();
    const note = resolveCurrentTargetNote({
      app,
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

  createNoteWithInsertAfter: async (app, settings, targetDate) => {
    const {
      granularity,
      activeTopic,
      getEffectiveDate,
      viewNoteMode,
      fixedNotePath,
    } = get();

    if (viewNoteMode === "fixed") {
      if (!fixedNotePath) return null;
      const fixedNote = await ensureFixedNote(app, fixedNotePath);
      set({ currentDailyNote: fixedNote });
      return fixedNote;
    }

    const date = targetDate ?? getEffectiveDate();
    const existing = resolveCurrentTargetNote({
      app,
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

    const created = await createTopicNote(app, date, granularity, activeTopic);
    if (settings.insertAfter) {
      const content = await app.vault.read(created);
      if (!content.includes(settings.insertAfter)) {
        await app.vault.modify(
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

  handleClickOpenDailyNote: async (app, settings) => {
    const {
      granularity,
      activeTopic,
      getEffectiveDate,
      viewNoteMode,
      fixedNotePath,
    } = get();
    const targetDate = getEffectiveDate();
    let note = resolveCurrentTargetNote({
      app,
      date: targetDate,
      granularity,
      activeTopic,
      noteMode: viewNoteMode,
      fixedNotePath,
    });

    if (!note) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      note = await get().createNoteWithInsertAfter(app, settings, targetDate);
    }

    if (note) {
      set({ currentDailyNote: note });
      await app.workspace.getLeaf(true).openFile(note);
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
