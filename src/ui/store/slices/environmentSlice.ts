import { StateCreator } from "zustand/vanilla";
import { EnvironmentSlice, MFDIStore } from "./types";

export const createEnvironmentSlice: StateCreator<
  MFDIStore,
  [],
  [],
  EnvironmentSlice
> = (set, get) => ({
  shell: null,
  appHelper: null,
  storage: null,
  pluginSettings: null,
  viewNoteMode: "periodic",
  fixedNotePath: null,

  setAppDependencies: (shell, appHelper) => {
    set({ shell, appHelper });
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

  initializeAppStore: ({ shell, appHelper, settings, storage }) => {
    set({
      shell,
      appHelper,
      pluginSettings: settings,
      storage,
      viewNoteMode: "periodic",
      fixedNotePath: null,
    });
    get().hydrateSettingsState();
    get().hydrateEditorState();
    get().hydrateDraftState();
  },
});
