import { around } from "monkey-around";
import { Plugin, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { unpatchToggleSourceCommand } from "@22-2/obsidian-magical-editor";
import { AppHelper } from "src/app-helper";
import { createFixedNoteFromInput } from "src/core/note-source";
import {
  createTagIndexExtension,
  TagIndexExtension
} from "src/core/tag-index-extension";
import { DEFAULT_SETTINGS, MFDISettingTab, Settings } from "src/settings";
import { Topic } from "src/topic";
import { showInputModal } from "src/ui/modals/InputModal";
import { TopicManagerModal } from "src/ui/modals/TopicManagerModal";
import { MFDIView, VIEW_TYPE_MFDI } from "src/ui/view/MFDIView";
import {
  createFixedNoteViewState,
  DEFAULT_MFDI_VIEW_STATE,
  MFDIViewState
} from "src/ui/view/state";
import {
  isMFDIFixedNotePath,
  normalizeFixedNotePath
} from "src/utils/fixed-note";

export default class MFDIPlugin extends Plugin {
  appHelper: AppHelper;
  settings: Settings;
  settingTab: MFDISettingTab;
  tagIndexExtension: TagIndexExtension;
  view?: MFDIView;

  async onload() {
    this.appHelper = new AppHelper(this.app);
    await this.loadSettings();
    this.tagIndexExtension = createTagIndexExtension(this.appHelper.getAppId());

    this.settingTab = new MFDISettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    this.registerMFDIView();
    this.registerRibbonActions();
    this.registerCommands();
    this.patchSetViewStateForFixedNotes();
    this.registerEventListeners();

    this.app.workspace.onLayoutReady(() => {
      void this.tagIndexExtension.fullScan(this.appHelper, this.settings);
    });

    void this.replaceOpenFixedMarkdownLeaves();
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
      this.app.metadataCache.on("changed", (file) => {
        void this.handleFileChanged(file);
      }),
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

    const fixedNote = await createFixedNoteFromInput(
      this.appHelper,
      folder,
      name,
    );

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

  private patchSetViewStateForFixedNotes() {
    const plugin = this;

    this.register(
      around(WorkspaceLeaf.prototype, {
        setViewState(original: Function) {
          return function (this: WorkspaceLeaf, viewState, eState) {
            const nextState =
              plugin.convertMarkdownViewStateForFixedNote(viewState);
            return original.call(this, nextState, eState);
          };
        },
      }),
    );
  }

  private convertMarkdownViewStateForFixedNote(viewState: any): any {
    if (!viewState || viewState.type !== "markdown") return viewState;

    // フラグが付与されている場合は強制的にMarkdownビューとして開く意図がある。
    if (viewState.state?.__mfdi_force_markdown) return viewState;

    const filePath =
      typeof viewState.state?.file === "string" ? viewState.state.file : "";
    if (!isMFDIFixedNotePath(filePath)) return viewState;

    // if (!this.settings.fixedNoteFiles.some((f) => f.path === filePath)) {
    //   return viewState;
    // }

    return {
      ...viewState,
      type: VIEW_TYPE_MFDI,
      state: {
        ...DEFAULT_MFDI_VIEW_STATE,
        ...createFixedNoteViewState(filePath),
      },
    };
  }

  private async replaceOpenFixedMarkdownLeaves() {
    const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");

    for (const leaf of markdownLeaves) {
      const filePath = (leaf.view as any)?.file?.path;
      if (typeof filePath !== "string") continue;
      if (!isMFDIFixedNotePath(filePath)) continue;
      // if (!this.settings.fixedNoteFiles.some((f) => f.path === filePath)) {
      //   continue;
      // }

      await this.attachMFDIView(createFixedNoteViewState(filePath), leaf);
    }
  }

  private handleFileRename(file: TAbstractFile | null, oldPath: string) {
    if (!(file instanceof TFile)) return;

    void this.tagIndexExtension.handleFileRenamed(
      this.appHelper,
      file,
      oldPath,
      this.settings,
    );

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

    void this.tagIndexExtension.handleFileDeleted(file.path);

    const filtered = this.settings.fixedNoteFiles.filter(
      (f) => f.path !== file.path,
    );
    if (filtered.length === this.settings.fixedNoteFiles.length) return;

    this.settings.fixedNoteFiles = filtered;
    this.saveSettings();
  }

  private async handleFileChanged(file: TFile) {
    await this.tagIndexExtension.handleFileChanged(
      this.appHelper,
      file,
      this.settings,
    );
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
    const fixedPath = normalizeFixedNotePath(
      typeof state.fixedNotePath === "string" ? state.fixedNotePath : "",
    );
    const isFixedMode = state.noteMode === "fixed";

    return this.app.workspace.getLeavesOfType(VIEW_TYPE_MFDI).find((leaf) => {
      if (!(leaf.view instanceof MFDIView)) return false;

      const currentState = leaf.view.getState();
      return isFixedMode
        ? currentState.noteMode === "fixed" &&
            normalizeFixedNotePath(currentState.fixedNotePath ?? "") ===
              fixedPath
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

  onunload(): void {
    void this.tagIndexExtension?.dispose();
    unpatchToggleSourceCommand();
  }
}
