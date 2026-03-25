import { around } from "monkey-around";
import { App, EventRef, TFile, WorkspaceLeaf } from "obsidian";
import { AppHelper } from "src/app-helper";
import {
  FixedNoteViewExtension
} from "src/core/fixed-note-view-extension";
import { TagIndexExtension } from "src/core/tag-index-extension";
import { Settings } from "src/settings";
import { MFDIViewState } from "src/ui/view/state";

export interface MainServiceContext {
  app: App;
  appHelper: AppHelper;
  getSettings: () => Settings;
  saveSettings: () => Promise<void>;
  register: (cb: () => unknown) => void;
  registerEvent: (eventRef: EventRef) => void;
  attachMFDIView: (
    state: Partial<MFDIViewState>,
    preferredLeaf?: WorkspaceLeaf,
  ) => Promise<WorkspaceLeaf | undefined>;
  fixedNoteViewExtension: FixedNoteViewExtension;
  tagIndexExtension: TagIndexExtension;
}

export interface BuiltinMainService {
  id: string;
  activate: (context: MainServiceContext) => void;
}

export function createTagIndexLifecycleService(): BuiltinMainService {
  return {
    id: "tag-index-lifecycle",
    activate: (context) => {
      context.app.workspace.onLayoutReady(() => {
        void context.tagIndexExtension.fullScan(
          context.appHelper,
          context.getSettings(),
        );
      });

      context.registerEvent(
        context.app.metadataCache.on("changed", (file) => {
          void context.tagIndexExtension.handleFileChanged(
            context.appHelper,
            file,
            context.getSettings(),
          );
        }),
      );

      context.registerEvent(
        context.app.vault.on("rename", (file, oldPath) => {
          if (!(file instanceof TFile)) return;
          void context.tagIndexExtension.handleFileRenamed(
            context.appHelper,
            file,
            oldPath,
            context.getSettings(),
          );
        }),
      );

      context.registerEvent(
        context.app.vault.on("delete", (file) => {
          if (!(file instanceof TFile)) return;
          void context.tagIndexExtension.handleFileDeleted(file.path);
        }),
      );
    },
  };
}

export function createFixedNoteRegistryService(): BuiltinMainService {
  return {
    id: "fixed-note-registry",
    activate: (context) => {
      context.registerEvent(
        context.app.vault.on("rename", (file, oldPath) => {
          if (!(file instanceof TFile)) return;

          const settings = context.getSettings();
          const idx = settings.fixedNoteFiles.findIndex(
            (entry) => entry.path === oldPath,
          );
          if (idx === -1) return;

          settings.fixedNoteFiles = settings.fixedNoteFiles.map((entry, index) =>
            index === idx ? { ...entry, path: file.path } : entry,
          );
          void context.saveSettings();
        }),
      );

      context.registerEvent(
        context.app.vault.on("delete", (file) => {
          if (!(file instanceof TFile)) return;

          const settings = context.getSettings();
          const filtered = settings.fixedNoteFiles.filter(
            (entry) => entry.path !== file.path,
          );
          if (filtered.length === settings.fixedNoteFiles.length) return;

          settings.fixedNoteFiles = filtered;
          void context.saveSettings();
        }),
      );
    },
  };
}

export function createFixedNoteViewLifecycleService(): BuiltinMainService {
  return {
    id: "fixed-note-view-lifecycle",
    activate: (context) => {
      context.register(
        around(WorkspaceLeaf.prototype, {
          setViewState(original: Function) {
            return function (this: WorkspaceLeaf, viewState, eState) {
              const nextState =
                context.fixedNoteViewExtension.convertMarkdownViewState(viewState);
              return original.call(this, nextState, eState);
            };
          },
        }),
      );

      // main は service の順序だけを持ち、各副作用の配線は built-in service 側へ寄せる。
      void context.fixedNoteViewExtension.replaceOpenFixedMarkdownLeaves({
        leaves: context.app.workspace.getLeavesOfType("markdown"),
        attachMFDIView: context.attachMFDIView,
      });
    },
  };
}

export function createBuiltinMainServices(): BuiltinMainService[] {
  return [
    createTagIndexLifecycleService(),
    createFixedNoteRegistryService(),
    createFixedNoteViewLifecycleService(),
  ];
}
