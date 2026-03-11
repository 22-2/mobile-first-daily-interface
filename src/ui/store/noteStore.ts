import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { TFile, App, Notice } from "obsidian";
import { MomentLike, Granularity } from "src/ui/types";
import { Settings } from "src/settings";
import { createTopicNote, getTopicNote } from "src/utils/daily-notes";
import { settingsStore } from "./settingsStore";
import { postsStore } from "./postsStore";

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
    const { date, granularity, activeTopic } = settingsStore.getState();
    const note = getTopicNote(app, date, granularity, activeTopic);
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
    const { date, granularity, activeTopic } = settingsStore.getState();
    const d = targetDate ?? date;
    const created = await createTopicNote(app, d, granularity, activeTopic);
    if (created && settings.insertAfter) {
      const content = await app.vault.read(created);
      if (!content.includes(settings.insertAfter)) {
        await app.vault.modify(
          created,
          content ? `${content}\n${settings.insertAfter}` : settings.insertAfter,
        );
      }
    }
    return created;
  },

  handleClickOpenDailyNote: async (app, settings) => {
    const { date, granularity, activeTopic, setDate } = settingsStore.getState();
    const currentNote = get().currentDailyNote;
    if (!currentNote) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      await get().createNoteWithInsertAfter(app, settings);
      setDate(date.clone());
    }
    const note = getTopicNote(app, date, granularity, activeTopic);
    if (note) {
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
