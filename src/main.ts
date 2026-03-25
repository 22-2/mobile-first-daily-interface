import { unpatchToggleSourceCommand } from "@22-2/obsidian-magical-editor";
import { Plugin, WorkspaceLeaf } from "obsidian";
import {
  BuiltinMainContext,
  createBuiltinRegistry,
} from "src/core/builtin-registry";
import { createFixedNoteViewExtension } from "src/core/fixed-note-view-extension";
import { createFixedNoteFromInput } from "src/core/note-source";
import {
  createTagIndexExtension,
  TagIndexExtension,
} from "src/core/tag-index-extension";
import { DEFAULT_SETTINGS, MFDISettingTab, Settings } from "src/settings";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { Topic } from "src/topic";
import { showInputModal } from "src/ui/modals/InputModal";
import { TopicManagerModal } from "src/ui/modals/TopicManagerModal";
import { MFDIView, VIEW_TYPE_MFDI } from "src/ui/view/MFDIView";
import {
  createFixedNoteViewState,
  DEFAULT_MFDI_VIEW_STATE,
  MFDIViewState,
} from "src/ui/view/state";

export default class MFDIPlugin extends Plugin {
  shell: ObsidianAppShell;
  settings: Settings;
  settingTab: MFDISettingTab;
  tagIndexExtension: TagIndexExtension;
  fixedNoteViewExtension = createFixedNoteViewExtension();
  view?: MFDIView;

  async onload() {
    this.shell = new ObsidianAppShell(this.app);
    await this.loadSettings();
    this.tagIndexExtension = createTagIndexExtension(this.shell.getAppId());

    this.settingTab = new MFDISettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    this.activateBuiltinRegistry();
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
    // main は host API と domain callback を束ねるだけにして、登録処理は registry 側へ寄せる。
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
      createAndOpenFixedNote: () => this.createAndOpenFixedNote(),
      attachMFDIView: (state, preferredLeaf) =>
        this.attachMFDIView(state, preferredLeaf),
      fixedNoteViewExtension: this.fixedNoteViewExtension,
      tagIndexExtension: this.tagIndexExtension,
    };

    createBuiltinRegistry().activate(context);
  }

  /**
   * MFDIのViewをアタッチします。
   * 同一条件のleafが既に存在する場合はそちらを再利用します。
   */
  async attachMFDIView(
    state: Partial<MFDIViewState> = DEFAULT_MFDI_VIEW_STATE,
    preferredLeaf?: WorkspaceLeaf,
  ): Promise<WorkspaceLeaf | undefined> {
    const mergedState = { ...DEFAULT_MFDI_VIEW_STATE, ...state };

    const existingLeaf = this.findExistingLeaf(state);
    const targetLeaf =
      preferredLeaf ?? existingLeaf ?? this.app.workspace.getLeaf(false);

    await targetLeaf.setViewState({
      type: VIEW_TYPE_MFDI,
      active: true,
      state: mergedState,
    });

    return targetLeaf;
  }

  /**
   * 条件に合致する既存のMFDI leafを探します。
   */
  private findExistingLeaf(
    state: Partial<MFDIViewState>,
  ): WorkspaceLeaf | undefined {
    return this.fixedNoteViewExtension.findExistingLeaf(
      this.app.workspace.getLeavesOfType(VIEW_TYPE_MFDI),
      state,
    );
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
    void this.tagIndexExtension?.dispose();
    unpatchToggleSourceCommand();
  }
}
