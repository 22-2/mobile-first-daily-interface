import { unpatchToggleSourceCommand } from "@22-2/obsidian-magical-editor";
import type { WorkspaceLeaf } from "obsidian";
import { Plugin } from "obsidian";
import type { BuiltinMainContext } from "src/core/builtin-registry";
import { activateBuiltins } from "src/core/builtin-registry";
import { createFixedNoteFromInput } from "src/core/note-source";
import type { Topic } from "src/core/topic";
import { WorkerClient } from "src/db/worker-client";
import { findExistingMFDILeaf } from "src/extensions/fixed-note-view-extension";
import type { Settings } from "src/settings";
import { DEFAULT_SETTINGS, MFDISettingTab } from "src/settings";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { showInputModal } from "src/ui/modals/InputModal";
import { TopicManagerModal } from "src/ui/modals/TopicManagerModal";
import { MFDIEditorView } from "src/ui/view/MFDIEditorView";
import { MFDIView, VIEW_TYPE_MFDI } from "src/ui/view/MFDIView";
import type { MFDIViewState } from "src/ui/view/state";
import {
  createFixedNoteViewState,
  DEFAULT_MFDI_VIEW_STATE,
} from "src/ui/view/state";

export default class MFDIPlugin extends Plugin {
  shell: ObsidianAppShell;
  settings: Settings;
  view?: MFDIView;

  private async initializeWorker(): Promise<void> {
    // 意図: Worker 初期化は重くなりうるため、コマンド/ビュー登録をブロックしない。
    // lazy ロード直後に command wrapper から実コマンドへ到達できることを優先する。
    try {
      const db = WorkerClient.get();
      await db.initialize({ appId: this.shell.getAppId() });
    } catch (e) {
      console.error("Failed to initialize DB worker:", e);
    }
  }

  async onload() {
    this.app.workspace.onLayoutReady(async () => {
      this.shell = new ObsidianAppShell(this.app);
      await this.loadSettings();

      this.addSettingTab(new MFDISettingTab(this.app, this));

      // 先にコマンド/ビュー登録を済ませて、lazy コマンド初回呼び出しで実コマンドまで届くようにする。
      this.activateBuiltinRegistry();

      // Worker 初期化は非同期に開始（失敗はログのみ）。
      void this.initializeWorker();
    });
  }

  // ---------------------------------------------------------------------------
  // コマンド処理
  // ---------------------------------------------------------------------------

  private async createAndOpenFixedNote() {
    const folder = this.app.vault.config.newFileFolderPath || "/";

    const name = await showInputModal(this.app, {
      title: "固定ノートの名前を入力",
      placeholder: "Untitled",
    });
    if (name === null) return;

    const fixedNote = await createFixedNoteFromInput(this.shell, folder, name);

    this.settings.fixedNoteFiles = [
      ...this.settings.fixedNoteFiles,
      { path: fixedNote.path },
    ];
    await this.saveSettings();

    const leaf = await this.attachMFDIView(
      createFixedNoteViewState(fixedNote.path),
    );
    if (leaf) this.app.workspace.revealLeaf(leaf);
  }

  // ---------------------------------------------------------------------------
  // ビュー管理
  // ---------------------------------------------------------------------------

  private activateBuiltinRegistry() {
    // 意図: 登録処理は activateBuiltins へ委譲し、main 側は入力(context)だけ作る。
    // こうしておくと初期化の責務境界が明確で、plugin 固有 API の見通しを保てる。
    const context: BuiltinMainContext = {
      app: this.app,
      shell: this.shell,
      getSettings: () => this.settings,
      saveSettings: () => this.saveSettings(),
      register: (cb) => this.register(cb),
      registerEvent: (eventRef) => this.registerEvent(eventRef),
      registerView: (type, viewCreator) => this.registerView(type, viewCreator),
      addRibbonIcon: (icon, title, callback) =>
        this.addRibbonIcon(icon, title, callback),
      addCommand: (command) => this.addCommand(command),
      createMFDIView: (leaf) => {
        this.view = new MFDIView(leaf, this.settings);
        this.setupViewCallbacks(this.view);
        return this.view;
      },
      createMFDIEditorView: (leaf) => new MFDIEditorView(leaf, this.settings),
      createAndOpenFixedNote: () => this.createAndOpenFixedNote(),
      attachMFDIView: (state, preferredLeaf) =>
        this.attachMFDIView(state, preferredLeaf),
    };

    activateBuiltins(context, this.shell.getAppId());
  }

  // leaf 探索込みの setViewState ラッパー。同一条件の leaf が既に存在する場合は再利用する。
  async attachMFDIView(
    state: Partial<MFDIViewState> = DEFAULT_MFDI_VIEW_STATE,
    preferredLeaf?: WorkspaceLeaf,
  ): Promise<WorkspaceLeaf | undefined> {
    const mergedState = { ...DEFAULT_MFDI_VIEW_STATE, ...state };
    const existing = findExistingMFDILeaf(
      this.app.workspace.getLeavesOfType(VIEW_TYPE_MFDI),
      state,
    );
    const targetLeaf =
      preferredLeaf ?? existing ?? this.app.workspace.getLeaf(false);

    await targetLeaf.setViewState({
      type: VIEW_TYPE_MFDI,
      active: true,
      state: mergedState,
    });

    return targetLeaf;
  }

  /**
   * MFDIView のコールバックを設定する
   */
  private setupViewCallbacks(view: MFDIView) {
    view.handlers.onTopicSaveRequested = async (topicId: string) => {
      this.settings.activeTopic = topicId;
      await this.saveSettings();
    };

    view.handlers.onOpenTopicManager = () => {
      const modal = new TopicManagerModal(
        this.app,
        this.settings.topics,
        this.settings.activeTopic,
        async (topics: Topic[], activeTopic: string) => {
          this.settings.topics = topics;
          this.settings.activeTopic = activeTopic;
          await this.saveSettings();
          view.handlers.onChangeTopic?.(activeTopic);
        },
      );
      modal.open();
    };
  }

  // ---------------------------------------------------------------------------
  // 設定管理
  // ---------------------------------------------------------------------------

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async loadSettings(): Promise<void> {
    const currentSettings = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...currentSettings };
  }

  rerenderView() {
    this.view?.updateSettings(this.settings);
  }

  onunload(): void {
    unpatchToggleSourceCommand();
  }
}
