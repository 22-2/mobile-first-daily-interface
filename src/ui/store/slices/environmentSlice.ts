import { StateCreator } from "zustand/vanilla";
import { EnvironmentSlice, MFDIStore } from "./types";

export const createEnvironmentSlice: StateCreator<
  MFDIStore,
  [],
  [],
  EnvironmentSlice
> = (set, get) => ({
  app: null,
  appHelper: null,
  storage: null,
  pluginSettings: null,

  setAppDependencies: (app, appHelper) => {
    set({ app, appHelper });
  },

  setStorage: (storage) => {
    set({ storage });
  },

  setPluginSettings: (pluginSettings) => {
    set({ pluginSettings });
  },

  initializeAppStore: ({ app, appHelper, settings, storage }) => {
    set({ app, appHelper, pluginSettings: settings, storage });
    get().hydrateSettingsState();
    get().hydrateEditorState();
  },
});
