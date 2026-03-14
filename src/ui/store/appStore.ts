import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { createEditorSlice } from "./slices/editorSlice";
import { createEnvironmentSlice } from "./slices/environmentSlice";
import { createNoteSlice } from "./slices/noteSlice";
import { createPostsSlice } from "./slices/postsSlice";
import { createSettingsSlice } from "./slices/settingsSlice";
import { MFDIStore } from "./slices/types";

export const appStore = createStore<MFDIStore>((set, get, store) => ({
  ...createEnvironmentSlice(set, get, store),
  ...createSettingsSlice(set, get, store),
  ...createPostsSlice(set, get, store),
  ...createNoteSlice(set, get, store),
  ...createEditorSlice(set, get, store),
}));

export function initializeAppStore(params: {
  app: NonNullable<MFDIStore["app"]>;
  appHelper: NonNullable<MFDIStore["appHelper"]>;
  settings: NonNullable<MFDIStore["pluginSettings"]>;
  storage: NonNullable<MFDIStore["storage"]>;
}) {
  appStore.getState().initializeAppStore(params);
}

export function useAppStore<T>(selector: (state: MFDIStore) => T): T {
  return useStore(appStore, selector);
}

export type { MFDIStore } from "./slices/types";
