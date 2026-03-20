import { App } from "obsidian";
import { AppHelper } from "src/app-helper";
import {
  appStore, AppStoreApi, useCurrentAppStore
} from "src/ui/store/appStore";
import type { MFDIStore, PostsSlice } from "src/ui/store/slices/types";
import { useStore } from "zustand";

export const postsStore = appStore;

export function initializePostsStore(
  app: App,
  appHelper: AppHelper,
  store: AppStoreApi = appStore,
) {
  store.getState().setAppDependencies(app, appHelper);
}

export function usePostsStore<T>(
  selector: (state: PostsSlice & MFDIStore) => T,
): T {
  const store = useCurrentAppStore();
  return useStore(store, selector as (state: MFDIStore) => T);
}
