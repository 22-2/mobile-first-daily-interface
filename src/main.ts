import {
  Notice,
  Plugin,
  TAbstractFile,
  TFile,
  WorkspaceLeaf,
  MarkdownView,
} from "obsidian";
import { AppHelper } from "src/app-helper";
import { DEFAULT_SETTINGS, MFDISettingTab, Settings } from "src/settings";
import { Topic } from "src/topic";
import { showInputModal } from "src/ui/modals/InputModal";
import { TopicManagerModal } from "src/ui/modals/TopicManagerModal";
import { MFDIView, VIEW_TYPE_MFDI } from "src/ui/view/MFDIView";
import {
  createFixedNoteViewState,
  DEFAULT_MFDI_VIEW_STATE,
  MFDIViewState,
} from "src/ui/view/state";
import {
  createNewFixedNote,
  buildFixedNotePathFromName,
  ensureFixedNote,
  normalizeFixedNotePath,
} from "src/utils/fixed-note";

export default class MFDIPlugin extends Plugin {
  appHelper: AppHelper;
  settings: Settings;
  settingTab: MFDISettingTab;
  view?: MFDIView;

  async onload() {
    this.appHelper = new AppHelper(this.app);
    await this.loadSettings();

    this.settingTab = new MFDISettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    this.registerMFDIView();
    this.registerRibbonActions();
    this.registerCommands();
    this.registerEventListeners();
  }

  // ---------------------------------------------------------------------------
  // 登録系メソッド
  // ---------------------------------------------------------------------------

  private registerMFDIView() {
    this.registerView(VIEW_TYPE_MFDI, (leaf) => {
      this.view = new MFDIView(leaf, this.settings);
      this.setupViewCallbacks(this.view);
      return this.view;
    });
  }

  private registerRibbonActions() {
    this.addRibbonIcon("pencil", "Mobile First Daily Interface", () =>
      this.attachMFDIView(),
    );
  }

  private registerCommands() {
    this.addCommand({
      id: "mfdi-open-view",
      name: "Open Mobile First Daily Interface",
      callback: async () => {
        const leaf = await this.attachMFDIView();
        if (leaf) this.app.workspace.revealLeaf(leaf);
      },
    });

    this.addCommand({
      id: "mfdi-open-fixed-note-view",
      name: "Create New MFDI Fixed Note",
      callback: () => this.createAndOpenFixedNote(),
    });
  }

  private registerEventListeners() {
    this.registerEvent(
      this.app.workspace.on("file-open", (file) =>
        this.handleFileOpen(file),
      ),
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) =>
        this.handleFileRename(file, oldPath),
      ),
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => this.handleFileDelete(file)),
    );
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

    const path = name.trim()
      ? buildFixedNotePathFromName(folder, name, this.app)
      : undefined;

    const fixedNote = path
      ? await ensureFixedNote(this.app, path)
      : await createNewFixedNote(this.app, folder);

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
  // イベントハンドラ
  // ---------------------------------------------------------------------------

  private handleFileOpen(file: TFile | null) {
    if (!(file instanceof TFile)) return;
    if (!file.path.endsWith(".mfdi.md")) return;
    if (!this.settings.fixedNoteFiles.some((f) => f.path === file.path)) return;

    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf) return;
    if (!(activeLeaf.view instanceof MarkdownView)) return;
    if (activeLeaf.view.file?.path !== file.path) return;

    this.attachMFDIView(createFixedNoteViewState(file.path), activeLeaf).then((leaf) => {
      if (leaf) this.app.workspace.revealLeaf(leaf);
    });
  }

  private handleFileRename(file: TAbstractFile | null, oldPath: string) {
    if (!(file instanceof TFile)) return;

    const idx = this.settings.fixedNoteFiles.findIndex(
      (f) => f.path === oldPath,
    );
    if (idx === -1) return;

    this.settings.fixedNoteFiles = this.settings.fixedNoteFiles.map((f, i) =>
      i === idx ? { ...f, path: file.path } : f,
    );
    this.saveSettings();
  }

  private handleFileDelete(file: TAbstractFile | null) {
    if (!(file instanceof TFile)) return;

    const filtered = this.settings.fixedNoteFiles.filter(
      (f) => f.path !== file.path,
    );
    if (filtered.length === this.settings.fixedNoteFiles.length) return;

    this.settings.fixedNoteFiles = filtered;
    this.saveSettings();
  }

  // ---------------------------------------------------------------------------
  // ビュー管理
  // ---------------------------------------------------------------------------

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
    const targetLeaf = existingLeaf ?? preferredLeaf ?? this.app.workspace.getLeaf(false);

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
    const fixedPath = normalizeFixedNotePath(
      typeof state.fixedNotePath === "string" ? state.fixedNotePath : "",
    );
    const isFixedMode = state.noteMode === "fixed";

    return this.app.workspace
      .getLeavesOfType(VIEW_TYPE_MFDI)
      .find((leaf) => {
        if (!(leaf.view instanceof MFDIView)) return false;

        const currentState = leaf.view.getState();
        return isFixedMode
          ? currentState.noteMode === "fixed" &&
              normalizeFixedNotePath(currentState.fixedNotePath ?? "") === fixedPath
          : currentState.noteMode !== "fixed";
      });
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
}
