import { Notice } from "obsidian";
import { StateCreator } from "zustand/vanilla";
import { MFDIStore, NoteSlice } from "./types";
import { createTopicNote, getTopicNote } from "src/utils/daily-notes";

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
    const { granularity, activeTopic, getEffectiveDate, currentDailyNote } =
      get();
    const note = getTopicNote(
      app,
      getEffectiveDate(),
      granularity,
      activeTopic,
    );
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
    const { granularity, activeTopic, getEffectiveDate } = get();
    const date = targetDate ?? getEffectiveDate();
    const existing = getTopicNote(app, date, granularity, activeTopic);
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
    const { granularity, activeTopic, getEffectiveDate } = get();
    const targetDate = getEffectiveDate();
    let note = getTopicNote(app, targetDate, granularity, activeTopic);

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
