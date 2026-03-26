import { MFDIDatabase } from "src/db/mfdi-db";
import { EnvironmentSlice, MFDIStore } from "src/ui/store/slices/types";
import { StateCreator } from "zustand/vanilla";

export const createEnvironmentSlice: StateCreator<
  MFDIStore,
  [],
  [],
  EnvironmentSlice
> = (set, get) => ({
  shell: null,
  storage: null,
  db: null,
  pluginSettings: null,
  viewNoteMode: "periodic",
  fixedNotePath: null,

  setAppDependencies: (shell) => {
    set({ shell });
  },

  setStorage: (storage) => {
    set({ storage });
  },

  setPluginSettings: (pluginSettings) => {
    set({ pluginSettings });
  },

  setViewContext: ({ noteMode, fixedNotePath }) => {
    set({ viewNoteMode: noteMode, fixedNotePath });
  },

  initializeAppStore: ({ shell, settings, storage }) => {
    const oldDb = get().db;
    if (oldDb) {
      oldDb.close();
    }

    set({
      shell,
      pluginSettings: settings,
      storage,
      db: new MFDIDatabase(shell.getAppId()),
      viewNoteMode: "periodic",
      fixedNotePath: null,
    });
    get().hydrateSettingsState();
    get().hydrateEditorState();
    get().hydrateDraftState();
  },
});
