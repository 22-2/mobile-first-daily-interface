import * as React from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { createDraftSlice } from "./slices/draftSlice";
import { createEditorSlice } from "./slices/editorSlice";
import { createEnvironmentSlice } from "./slices/environmentSlice";
import { createNoteSlice } from "./slices/noteSlice";
import { createPostsSlice } from "./slices/postsSlice";
import { createSettingsSlice } from "./slices/settingsSlice";
import { MFDIStore } from "./slices/types";

export function createAppStore() {
  return createStore<MFDIStore>((set, get, store) => ({
    ...createEnvironmentSlice(set, get, store),
    ...createSettingsSlice(set, get, store),
    ...createPostsSlice(set, get, store),
    ...createNoteSlice(set, get, store),
    ...createEditorSlice(set, get, store),
    ...createDraftSlice(set, get, store),
  }));
}

export type AppStoreApi = ReturnType<typeof createAppStore>;

export const appStore = createAppStore();

const AppStoreContext = React.createContext<AppStoreApi | null>(null);

export function AppStoreProvider({
  store,
  children,
}: {
  store: AppStoreApi;
  children: React.ReactNode;
}) {
  return React.createElement(
    AppStoreContext.Provider,
    { value: store },
    children,
  );
}

export function useCurrentAppStore(): AppStoreApi {
  return React.useContext(AppStoreContext) ?? appStore;
}

export function initializeAppStore(
  params: {
    app: NonNullable<MFDIStore["app"]>;
    appHelper: NonNullable<MFDIStore["appHelper"]>;
    settings: NonNullable<MFDIStore["pluginSettings"]>;
    storage: NonNullable<MFDIStore["storage"]>;
  },
  store: AppStoreApi = appStore,
) {
  store.getState().initializeAppStore(params);
}

export function useAppStore<T>(selector: (state: MFDIStore) => T): T {
  const store = useCurrentAppStore();
  return useStore(store, selector);
}

export type { MFDIStore } from "./slices/types";
