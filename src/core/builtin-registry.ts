import { around } from "monkey-around";
import { App, Command, EventRef, TFile, WorkspaceLeaf } from "obsidian";
import { FixedNoteViewExtension } from "src/core/fixed-note-view-extension";
import { TagIndexExtension } from "src/core/tag-index-extension";
import { Settings } from "src/settings";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import type { MFDIView } from "src/ui/view/MFDIView";
import { MFDIViewState } from "src/ui/view/state";

const VIEW_TYPE_MFDI = "mfdi-view";

export interface BuiltinMainContext {
  app: App;
  shell: ObsidianAppShell;
  getSettings: () => Settings;
  saveSettings: () => Promise<void>;
  register: (cb: () => unknown) => void;
  registerEvent: (eventRef: EventRef) => void;
  registerView: (
    type: string,
    viewCreator: (leaf: WorkspaceLeaf) => MFDIView,
  ) => void;
  addRibbonIcon: (
    icon: string,
    title: string,
    callback: () => void,
  ) => HTMLElement;
  addCommand: (command: Command) => Command;
  createMFDIView: (leaf: WorkspaceLeaf) => MFDIView;
  createAndOpenFixedNote: () => Promise<void>;
  attachMFDIView: (
    state: Partial<MFDIViewState>,
    preferredLeaf?: WorkspaceLeaf,
  ) => Promise<WorkspaceLeaf | undefined>;
  fixedNoteViewExtension: FixedNoteViewExtension;
  tagIndexExtension: TagIndexExtension;
}

export interface BuiltinContribution {
  id: string;
  activate: (context: BuiltinMainContext) => void;
}

export class BuiltinRegistry {
  constructor(private readonly contributions: BuiltinContribution[]) {}

  activate(context: BuiltinMainContext): void {
    // main は host API の橋渡しだけを持ち、起動順は registry 側で固定する。
    for (const contribution of this.contributions) {
      contribution.activate(context);
    }
  }
}

export function createViewRegistrationContribution(): BuiltinContribution {
  return {
    id: "view-registration",
    activate: (context) => {
      context.registerView(VIEW_TYPE_MFDI, (leaf) =>
        context.createMFDIView(leaf),
      );
    },
  };
}

export function createRibbonContribution(): BuiltinContribution {
  return {
    id: "open-view-ribbon",
    activate: (context) => {
      context.addRibbonIcon("pencil", "Mobile First Daily Interface", () => {
        void context.attachMFDIView({});
      });
    },
  };
}

export function createCommandContribution(): BuiltinContribution {
  return {
    id: "command-registration",
    activate: (context) => {
      context.addCommand({
        id: "mfdi-open-view",
        name: "Open Mobile First Daily Interface",
        callback: async () => {
          const leaf = await context.attachMFDIView({});
          if (leaf) context.app.workspace.revealLeaf(leaf);
        },
      });

      context.addCommand({
        id: "mfdi-open-fixed-note-view",
        name: "Create New MFDI Fixed Note",
        callback: () => {
          void context.createAndOpenFixedNote();
        },
      });
    },
  };
}

export function createTagIndexLifecycleContribution(): BuiltinContribution {
  return {
    id: "tag-index-lifecycle",
    activate: (context) => {
      context.app.workspace.onLayoutReady(() => {
        void context.tagIndexExtension.fullScan(
          context.shell,
          context.getSettings(),
        );
      });

      context.registerEvent(
        context.app.metadataCache.on("changed", (file) => {
          void context.tagIndexExtension.handleFileChanged(
            context.shell,
            file,
            context.getSettings(),
          );
        }),
      );

      context.registerEvent(
        context.app.vault.on("rename", (file, oldPath) => {
          if (!(file instanceof TFile)) return;
          void context.tagIndexExtension.handleFileRenamed(
            context.shell,
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

export function createFixedNoteRegistryContribution(): BuiltinContribution {
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

          settings.fixedNoteFiles = settings.fixedNoteFiles.map(
            (entry, index) =>
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

export function createFixedNoteViewLifecycleContribution(): BuiltinContribution {
  return {
    id: "fixed-note-view-lifecycle",
    activate: (context) => {
      context.register(
        around(WorkspaceLeaf.prototype, {
          setViewState(original: Function) {
            return function (this: WorkspaceLeaf, viewState, eState) {
              const nextState =
                context.fixedNoteViewExtension.convertMarkdownViewState(
                  viewState,
                );
              return original.call(this, nextState, eState);
            };
          },
        }),
      );

      void context.fixedNoteViewExtension.replaceOpenFixedMarkdownLeaves({
        leaves: context.app.workspace.getLeavesOfType("markdown"),
        attachMFDIView: context.attachMFDIView,
      });
    },
  };
}

export function createBuiltinContributions(): BuiltinContribution[] {
  return [
    createViewRegistrationContribution(),
    createRibbonContribution(),
    createCommandContribution(),
    createTagIndexLifecycleContribution(),
    createFixedNoteRegistryContribution(),
    createFixedNoteViewLifecycleContribution(),
  ];
}

export function createBuiltinRegistry(
  contributions: BuiltinContribution[] = createBuiltinContributions(),
): BuiltinRegistry {
  return new BuiltinRegistry(contributions);
}
