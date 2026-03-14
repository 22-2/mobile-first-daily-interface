import { appStore } from "src/ui/store/appStore";
import type { MFDIStore, NoteSlice } from "src/ui/store/slices/types";
import { useStore } from "zustand";

export const noteStore = appStore;

export function useNoteStore<T>(
  selector: (state: NoteSlice & MFDIStore) => T,
): T {
  return useStore(appStore, selector as (state: MFDIStore) => T);
}
