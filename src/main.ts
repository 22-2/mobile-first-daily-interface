import { Notice, Plugin } from "obsidian";
import { AppHelper } from "./app-helper";
import { DEFAULT_SETTINGS, MFDISettingTab, Settings } from "./settings";
import { MFDIView, VIEW_TYPE_MFDI } from "./ui/MFDIView";

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
      return this.view;
    });

    this.app.workspace.onLayoutReady(async () => {
      if (this.settings.autoStartOnLaunch) {
        await this.attachMFDIView();
      }
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

  // async onunload() {
  //   this.app.workspace.detachLeavesOfType(VIEW_TYPE_MFDI);
  // }

  /**
   * MFDIのViewをアタッチします
   */
  async attachMFDIView() {
    const existed = this.app.workspace.getLeavesOfType(VIEW_TYPE_MFDI).at(0);
    if (existed) {
      existed.setViewState({ type: VIEW_TYPE_MFDI, active: true });
      return existed;
    }

    const targetLeaf =
      this.settings.leaf === "left"
        ? this.app.workspace.getLeftLeaf(false)
        : this.settings.leaf === "center"
        ? this.app.workspace.getLeaf(true)
        : this.settings.leaf === "right"
        ? this.app.workspace.getRightLeaf(false)
        : undefined;
    if (!targetLeaf) {
      new Notice(`表示リーフの設定が不正です: ${this.settings.leaf}`);
      return;
    }

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
}
