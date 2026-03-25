import { unpatchToggleSourceCommand } from "@22-2/obsidian-magical-editor";
import { Plugin, WorkspaceLeaf } from "obsidian";
import {
  BuiltinMainContext,
  createBuiltinRegistry,
} from "src/core/builtin-registry";
import { createFixedNoteViewExtension } from "src/core/fixed-note-view-extension";
import { createFixedNoteFromInput } from "src/core/note-source";
import { createTagIndexExtension } from "src/core/tag-index-extension";
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
  view?: MFDIView;

  async onload() {
    this.shell = new ObsidianAppShell(this.app);
    await this.loadSettings();

    this.addSettingTab(new MFDISettingTab(this.app, this));

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
    // extension の所有は plugin フィールドではなくこのスコープのローカル変数に閉じ込める。
    const tagIndexExtension = createTagIndexExtension(this.shell.getAppId());
    const fixedNoteViewExtension = createFixedNoteViewExtension();

    // leaf 探索ロジックを fixedNoteViewExtension に委譲しつつ、plugin の public attachMFDIView を薄く保つ。
    const attachMFDIViewWithFinding = async (
      state: Partial<MFDIViewState> = DEFAULT_MFDI_VIEW_STATE,
      preferredLeaf?: WorkspaceLeaf,
    ): Promise<WorkspaceLeaf | undefined> => {
      const existing = fixedNoteViewExtension.findExistingLeaf(
        this.app.workspace.getLeavesOfType(VIEW_TYPE_MFDI),
        state,
      );
      return this.attachMFDIView(state, preferredLeaf ?? existing);
    };

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
      attachMFDIView: attachMFDIViewWithFinding,
      fixedNoteViewExtension,
      tagIndexExtension,
    };

    createBuiltinRegistry().activate(context);
  }

  // leaf 探索はしない生の setViewState ラッパー。探索が必要な呼び出し元は preferredLeaf を解決してから渡す。
  async attachMFDIView(
    state: Partial<MFDIViewState> = DEFAULT_MFDI_VIEW_STATE,
    preferredLeaf?: WorkspaceLeaf,
  ): Promise<WorkspaceLeaf | undefined> {
    const mergedState = { ...DEFAULT_MFDI_VIEW_STATE, ...state };
    const targetLeaf = preferredLeaf ?? this.app.workspace.getLeaf(false);

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
