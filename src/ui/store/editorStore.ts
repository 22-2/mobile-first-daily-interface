import type { MFDIStorage } from "src/core/storage";
import type { AppStoreApi } from "src/ui/store/appStore";
import { appStore, useCurrentAppStore } from "src/ui/store/appStore";
import type { EditorSlice, MFDIStore } from "src/ui/store/slices/types";
import { useStore } from "zustand";

export const editorStore = appStore;

function initializeEditorStore(
  storage: MFDIStorage,
  store: AppStoreApi = appStore,
) {
  const state = store.getState();
  state.setStorage(storage);
  state.hydrateEditorState();
}

export function useEditorStore<T>(
  selector: (state: EditorSlice & MFDIStore) => T,
): T {
  const store = useCurrentAppStore();
  return useStore(store, selector as (state: MFDIStore) => T);
}
