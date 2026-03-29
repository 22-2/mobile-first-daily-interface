import type { EnvironmentSlice, MFDIStore } from "src/ui/store/slices/types";
import type { StateCreator } from "zustand/vanilla";

export const createEnvironmentSlice: StateCreator<
  MFDIStore,
  [],
  [],
  EnvironmentSlice
> = (set, get) => ({
  shell: null,
  storage: null,
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
    set({
      shell,
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
