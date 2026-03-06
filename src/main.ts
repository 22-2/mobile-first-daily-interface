import { Plugin } from "obsidian";
import { AppHelper } from "./app-helper";
import { DEFAULT_SETTINGS, MFDISettingTab, Settings } from "./settings";
import { Topic } from "./topic";
import { MFDIView, VIEW_TYPE_MFDI } from "./ui/MFDIView";
import { TopicManagerModal } from "./ui/TopicManagerModal";

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
  }

  /**
   * MFDIのViewをアタッチします
   */
  async attachMFDIView() {
    const existed = this.app.workspace.getLeavesOfType(VIEW_TYPE_MFDI).at(0);
    if (existed) {
      existed.setViewState({ type: VIEW_TYPE_MFDI, active: true });
      return existed;
    }

    const targetLeaf = this.app.workspace.getLeaf(true)

    await targetLeaf.setViewState({
      type: VIEW_TYPE_MFDI,
      active: true,
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
    view.onTopicSaveRequested = async (topicId: string) => {
      this.settings.activeTopic = topicId;
      await this.saveSettings();
    };

    // トピック管理モーダルを開く
    view.onOpenTopicManager = () => {
      const modal = new TopicManagerModal(
        this.app,
        this.settings.topics,
        this.settings.activeTopic,
        async (topics: Topic[], activeTopic: string) => {
          this.settings.topics = topics;
          this.settings.activeTopic = activeTopic;
          await this.saveSettings();
          // ReactView内の state を更新
          view.onChangeTopic?.(activeTopic);
        }
      );
      modal.open();
    };
  }
}
