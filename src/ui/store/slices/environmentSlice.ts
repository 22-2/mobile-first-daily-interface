import { getInputStorageKey } from "src/ui/store/slices/inputStorage";
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
  file: null,

  setAppDependencies: (shell) => {
    set({ shell });
  },

  setStorage: (storage) => {
    set({ storage });
  },

  setPluginSettings: (pluginSettings) => {
    set({ pluginSettings });
  },

  setViewContext: ({ noteMode, file: file }) => {
    const {
      storage,
      viewNoteMode,
      file: currentFixedNotePath,
      getInputValue,
      replaceInput,
    } = get();

    const hasInputContextChanged =
      viewNoteMode !== noteMode ||
      (noteMode === "fixed" && currentFixedNotePath !== file);

    if (storage && hasInputContextChanged) {
      // 意図: periodic/fixed で編集中テキストを汚染しないよう、切替直前に現在ビューの入力を退避する。
      storage.set(
        getInputStorageKey(viewNoteMode, currentFixedNotePath),
        getInputValue(),
      );
    }

    set({ viewNoteMode: noteMode, file: file });

    if (storage && hasInputContextChanged) {
      // 意図: 切替先ビュー専用の入力だけを復元し、前ビューの未送信入力が混ざるのを防ぐ。
      const restoredInput = storage.get<string>(
        getInputStorageKey(noteMode, file),
        "",
      );
      replaceInput(restoredInput);
    }
  },

  initializeAppStore: ({ shell, settings, storage }) => {
    set({
      shell,
      pluginSettings: settings,
      storage,
      viewNoteMode: "periodic",
      file: null,
    });
    get().hydrateSettingsState();
    get().hydrateEditorState();
    get().hydrateDraftState();
  },
});
