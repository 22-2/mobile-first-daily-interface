import { Notice, Plugin, TFile } from "obsidian";
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

    this.registerView(VIEW_TYPE_MFDI, (leaf) => {
      this.view = new MFDIView(leaf, this.settings);
      this.setupViewCallbacks(this.view);
      return this.view;
    });

    this.addRibbonIcon("pencil", "Mobile First Daily Interface", async () => {
      await this.attachMFDIView();
    });

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
      callback: async () => {
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
      },
    });

    this.addCommand({
      id: "mfdi-open-current-note-in-fixed-view",
      name: "Open Current Note in MFDI Fixed Mode",
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!(activeFile instanceof TFile) || activeFile.extension !== "md") {
          new Notice("Markdown ノートを開いてから実行してください");
          return;
        }

        const leaf = await this.attachMFDIView(
          createFixedNoteViewState(activeFile.path),
        );
        if (leaf) this.app.workspace.revealLeaf(leaf);
      },
    });

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (
          file instanceof TFile &&
          file.path.endsWith(".mfdi.md") &&
          this.settings.fixedNoteFiles.some((f) => f.path === file.path)
        ) {
          this.attachMFDIView(createFixedNoteViewState(file.path)).then(
            (leaf) => {
              if (leaf) this.app.workspace.revealLeaf(leaf);
            },
          );
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (!(file instanceof TFile)) return;
        const idx = this.settings.fixedNoteFiles.findIndex(
          (f) => f.path === oldPath,
        );
        if (idx === -1) return;
        this.settings.fixedNoteFiles = this.settings.fixedNoteFiles.map(
          (f, i) => (i === idx ? { ...f, path: file.path } : f),
        );
        this.saveSettings();
      }),
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (!(file instanceof TFile)) return;
        const filtered = this.settings.fixedNoteFiles.filter(
          (f) => f.path !== file.path,
        );
        if (filtered.length === this.settings.fixedNoteFiles.length) return;
        this.settings.fixedNoteFiles = filtered;
        this.saveSettings();
      }),
    );
  }

  /**
   * MFDIのViewをアタッチします
   */
  async attachMFDIView(state: Partial<MFDIViewState> = DEFAULT_MFDI_VIEW_STATE) {
    const fixedPath = normalizeFixedNotePath(
      typeof state.fixedNotePath === "string" ? state.fixedNotePath : "",
    );
    const existed = this.app.workspace
      .getLeavesOfType(VIEW_TYPE_MFDI)
      .find((leaf) => {
        const view = leaf.view;
        if (!(view instanceof MFDIView)) return false;
        const currentState = view.getState();
        if (state.noteMode === "fixed") {
          return (
            currentState.noteMode === "fixed" &&
            normalizeFixedNotePath(currentState.fixedNotePath ?? "") ===
              fixedPath
          );
        }
        return currentState.noteMode !== "fixed";
      });

    if (existed) {
      await existed.setViewState({
        type: VIEW_TYPE_MFDI,
        active: true,
        state: { ...DEFAULT_MFDI_VIEW_STATE, ...state },
      });
      return existed;
    }

    const targetLeaf = this.app.workspace.getLeaf(true);

    await targetLeaf.setViewState({
      type: VIEW_TYPE_MFDI,
      active: true,
      state: { ...DEFAULT_MFDI_VIEW_STATE, ...state },
    });
    return targetLeaf;
  }

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

  /**
   * MFDIView のコールバックを設定する
   */
  private setupViewCallbacks(view: MFDIView) {
    // トピック切り替え時に settings を保存 (React側からの変更も含む)
    view.handlers.onTopicSaveRequested = async (topicId: string) => {
      this.settings.activeTopic = topicId;
      await this.saveSettings();
    };

    // トピック管理モーダルを開く
    view.handlers.onOpenTopicManager = () => {
      const modal = new TopicManagerModal(
        this.app,
        this.settings.topics,
        this.settings.activeTopic,
        async (topics: Topic[], activeTopic: string) => {
          this.settings.topics = topics;
          this.settings.activeTopic = activeTopic;
          await this.saveSettings();
          // ReactView内の state を更新
          view.handlers.onChangeTopic?.(activeTopic);
        },
      );
      modal.open();
    };
  }
}
