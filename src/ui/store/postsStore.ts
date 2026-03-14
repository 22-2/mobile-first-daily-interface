import { App } from "obsidian";
import { AppHelper } from "src/app-helper";
import { appStore } from "src/ui/store/appStore";
import type { MFDIStore, PostsSlice } from "src/ui/store/slices/types";
import { useStore } from "zustand";

export const postsStore = appStore;

export function initializePostsStore(app: App, appHelper: AppHelper) {
  appStore.getState().setAppDependencies(app, appHelper);
}

export function usePostsStore<T>(
  selector: (state: PostsSlice & MFDIStore) => T,
): T {
  return useStore(appStore, selector as (state: MFDIStore) => T);
}
