import { appStore } from "src/ui/store/appStore";
import type { EditorSlice, MFDIStore } from "src/ui/store/slices/types";
import { MFDIStorage } from "src/utils/storage";
import { useStore } from "zustand";

export const editorStore = appStore;

export function initializeEditorStore(storage: MFDIStorage) {
  const state = appStore.getState();
  state.setStorage(storage);
  state.hydrateEditorState();
}

export function useEditorStore<T>(
  selector: (state: EditorSlice & MFDIStore) => T,
): T {
  return useStore(appStore, selector as (state: MFDIStore) => T);
}
