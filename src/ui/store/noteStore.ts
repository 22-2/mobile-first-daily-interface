import { App, Notice, TFile } from "obsidian";
import { Settings } from "src/settings";
import { MomentLike } from "src/ui/types";
import { createTopicNote, getTopicNote } from "src/utils/daily-notes";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { postsStore } from "src/ui/store/postsStore";
import { settingsStore } from "src/ui/store/settingsStore";

interface NoteState {
  currentDailyNote: TFile | null;
  weekNotePaths: Set<string>;
  
  // Actions
  setCurrentDailyNote: (note: TFile | null) => void;
  updateCurrentDailyNote: (app: App) => void;
  replacePaths: (paths: Set<string>) => void;
  addPaths: (paths: Set<string>) => void;
  clearPaths: () => void;
  
  // Complex Actions
  createNoteWithInsertAfter: (app: App, settings: Settings, targetDate?: MomentLike) => Promise<TFile | null>;
  handleClickOpenDailyNote: (app: App, settings: Settings) => Promise<void>;
  handleChangeTopic: (topicId: string) => void;
}

export const noteStore = createStore<NoteState>((set, get) => ({
  currentDailyNote: null,
  weekNotePaths: new Set(),

  setCurrentDailyNote: (note) => set({ currentDailyNote: note }),

  updateCurrentDailyNote: (app) => {
    const { granularity, activeTopic, getEffectiveDate } = settingsStore.getState();
    const note = getTopicNote(app, getEffectiveDate(), granularity, activeTopic);
    if (note?.path !== get().currentDailyNote?.path) {
      set({ currentDailyNote: note });
    }
  },

  replacePaths: (paths) => set({ weekNotePaths: paths }),
  addPaths: (paths) => set((state) => {
    const next = new Set(state.weekNotePaths);
    paths.forEach(p => next.add(p));
    return { weekNotePaths: next };
  }),
  clearPaths: () => set({ weekNotePaths: new Set() }),

  createNoteWithInsertAfter: async (app, settings, targetDate) => {
    const { granularity, activeTopic, getEffectiveDate } = settingsStore.getState();
    const d = targetDate ?? getEffectiveDate();
    const existing = getTopicNote(app, d, granularity, activeTopic);
    if (existing) {
      set({ currentDailyNote: existing });
      return existing;
    }

    const created = await createTopicNote(app, d, granularity, activeTopic);
    if (settings.insertAfter) {
      const content = await app.vault.read(created);
      if (!content.includes(settings.insertAfter)) {
        await app.vault.modify(
          created,
          content ? `${content}\n${settings.insertAfter}` : settings.insertAfter,
        );
      }
    }
    set({ currentDailyNote: created });
    return created;
  },

  handleClickOpenDailyNote: async (app, settings) => {
    const { granularity, activeTopic, getEffectiveDate } = settingsStore.getState();
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
    const { activeTopic, setActiveTopic } = settingsStore.getState();
    if (activeTopic === topicId) return;
    setActiveTopic(topicId);
    set({ currentDailyNote: null });
    postsStore.getState().setPosts([]);
    postsStore.getState().setTasks([]);
  },
}));

export function useNoteStore<T>(selector: (state: NoteState) => T): T {
  return useStore(noteStore, selector);
}
