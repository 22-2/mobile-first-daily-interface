import { around } from "monkey-around";
import type { App, Command, EventRef } from "obsidian";
import { TFile, WorkspaceLeaf } from "obsidian";
import { MFDIStorage } from "src/core/storage";
import type { FixedNoteViewExtension } from "src/extensions/fixed-note-view-extension";
import { createFixedNoteViewExtension } from "src/extensions/fixed-note-view-extension";
import type { TagIndexExtension } from "src/extensions/tag-index-extension";
import { createTagIndexExtension } from "src/extensions/tag-index-extension";
import type { Settings } from "src/settings";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import type { MFDIView } from "src/ui/view/MFDIView";
import type { MFDIViewState } from "src/ui/view/state";

const VIEW_TYPE_MFDI = "mfdi-view";

// contribution が使う plugin ホスト API のみを列挙する。
// extension インスタンスは各 contribution が引数で受け取るため context には含めない。
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
}

function registerView(context: BuiltinMainContext): void {
  context.registerView(VIEW_TYPE_MFDI, (leaf) => context.createMFDIView(leaf));
}

function registerRibbon(context: BuiltinMainContext): void {
  context.addRibbonIcon("pencil", "Mobile First Daily Interface", () => {
    void context.attachMFDIView({});
  });
}

function registerCommands(context: BuiltinMainContext): void {
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
}

// extension を引数に取ることで contribution が自分の依存を所有し、context を汚染しない。
// テスト時はモック extension を直接注入できる。
function setupTagIndexLifecycle(
  tagIndexExtension: TagIndexExtension,
  storage: MFDIStorage,
  context: BuiltinMainContext,
): void {
  // dispose は Plugin の unload 機構に委ねて main のフィールドを不要にする
  context.register(() => {
    void tagIndexExtension.dispose();
  });

  context.app.workspace.onLayoutReady(async () => {
    try {
      const settings = context.getSettings();
      const intervalHours = settings.fullScanIntervalHours ?? 24;

      const last = storage.get<string | null>("lastFullScanAt", null);
      let shouldScan = false;

      if (!last) {
        shouldScan = true;
      } else {
        // intervalHours が 0 の場合は、常に(起動のたびに)スキャンを実行する
        const diffHours = window
          .moment()
          .diff(window.moment(last), "hours", true);
        shouldScan = diffHours >= intervalHours;
      }

      if (!shouldScan) {
        return;
      }
      await tagIndexExtension.fullScan(context.shell, settings);
      storage.set("lastFullScanAt", window.moment().toISOString());
    } catch (e) {
      console.error("Failed to run conditional full scan:", e);
    }
  });

  context.registerEvent(
    context.app.vault.on("create", (file) => {
      if (!(file instanceof TFile)) return;
      // 意図: 日付跨ぎ投稿では「ノート新規作成 -> 直後に追記」が連続し、
      // metadataCache.changed だけに依存すると初回インデックスを取りこぼすケースがある。
      // create を拾っておくことで、少なくとも新規ノート自体は確実に DB へ流せる。
      void tagIndexExtension.handleFileChanged(
        context.shell,
        file,
        context.getSettings(),
      );
    }),
  );

  context.registerEvent(
    context.app.vault.on("modify", (file) => {
      if (!(file instanceof TFile)) return;
      // 意図: 投稿保存は Vault の modify 経由で発生するため、
      // ここを一次トリガーにすると UI/DB の反映遅延を最小化できる。
      void tagIndexExtension.handleFileChanged(
        context.shell,
        file,
        context.getSettings(),
      );
    }),
  );

  context.registerEvent(
    context.app.metadataCache.on("changed", (file) => {
      void tagIndexExtension.handleFileChanged(
        context.shell,
        file,
        context.getSettings(),
      );
    }),
  );

  context.registerEvent(
    context.app.vault.on("rename", (file, oldPath) => {
      if (!(file instanceof TFile)) return;
      void tagIndexExtension.handleFileRenamed(
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
      void tagIndexExtension.handleFileDeleted(file.path);
    }),
  );
}

function setupFixedNoteRegistry(context: BuiltinMainContext): void {
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
}

function setupFixedNoteViewLifecycle(
  fixedNoteViewExtension: FixedNoteViewExtension,
  context: BuiltinMainContext,
): void {
  context.register(
    around(WorkspaceLeaf.prototype, {
      setViewState(original: Function) {
        return function (this: WorkspaceLeaf, viewState, eState) {
          const nextState =
            fixedNoteViewExtension.convertMarkdownViewState(viewState);
          return original.call(this, nextState, eState);
        };
      },
    }),
  );

  void fixedNoteViewExtension.replaceOpenFixedMarkdownLeaves({
    leaves: context.app.workspace.getLeavesOfType("markdown"),
    attachMFDIView: context.attachMFDIView,
  });
}

// 意図: 初期化順が機能要件そのものなので、一般化せず直列で明示する。
// ここを読めば起動時に何が登録されるかを追える状態にしておく。
export function activateBuiltins(
  context: BuiltinMainContext,
  appId: string,
): void {
  registerView(context);
  registerRibbon(context);
  registerCommands(context);

  setupTagIndexLifecycle(
    createTagIndexExtension(appId),
    new MFDIStorage(appId),
    context,
  );
  setupFixedNoteRegistry(context);
  setupFixedNoteViewLifecycle(createFixedNoteViewExtension(), context);
}
