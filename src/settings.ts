import { App, PluginSettingTab, Setting } from "obsidian";
import MFDIPlugin from "./main";
import { mirrorMap } from "./utils/collections";
import { TextComponentEvent } from "./obsutils/settings";

export interface Settings {
  leaf: string;
  autoStartOnLaunch: boolean;
  postFormatOption: PostFormatOption;
  insertAfter: string;
  enabledCardView: boolean;
  reverseOrder: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  leaf: "left",
  autoStartOnLaunch: false,
  postFormatOption: "コードブロック",
  insertAfter: "",
  enabledCardView: true,
  reverseOrder: false,
};

const leafOptions = ["left", "center", "right"];

export const postFormatMap = {
  コードブロック: { type: "codeblock" },
  Thino: { type: "thino" },
  見出し1: { type: "header", level: 1 },
  見出し2: { type: "header", level: 2 },
  見出し3: { type: "header", level: 3 },
  見出し4: { type: "header", level: 4 },
  見出し5: { type: "header", level: 5 },
  見出し6: { type: "header", level: 6 },
} as const;
export type PostFormatOption = keyof typeof postFormatMap;
export type PostFormat = (typeof postFormatMap)[PostFormatOption];

export class MFDISettingTab extends PluginSettingTab {
  plugin: MFDIPlugin;

  constructor(app: App, plugin: MFDIPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h3", { text: "🌍 全体" });

    new Setting(containerEl)
      .setName("投稿形式")
      .setDesc("MFDIの投稿形式を指定します。")
      .addDropdown((tc) =>
        tc
          .addOptions(mirrorMap(Object.keys(postFormatMap), (x) => x))
          .setValue(this.plugin.settings.postFormatOption)
          .onChange(async (value) => {
            this.plugin.settings.postFormatOption = value as PostFormatOption;
            await this.plugin.saveSettings();
            this.plugin.rerenderView();
          })
      );

    new Setting(containerEl)
      .setName("挿入位置 (文字列の後ろ)")
      .setDesc(
        "指定した文字列がファイル内にある場合、その直後に投稿内容を挿入します。空の場合はファイルの末尾に挿入します。"
      )
      .addText((tc) =>
        tc
          .setPlaceholder("## MFDI")
          .setValue(this.plugin.settings.insertAfter)
          .onChange(async (value) => {
            this.plugin.settings.insertAfter = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("表示リーフ")
      .setDesc("MFDI Viewを表示するリーフを指定します。")
      .addDropdown((tc) =>
        tc
          .addOptions(mirrorMap(leafOptions, (x) => x))
          .setValue(this.plugin.settings.leaf)
          .onChange(async (value) => {
            this.plugin.settings.leaf = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Obsidian起動時に自動起動・アクティブにする")
      .setDesc(
        "有効にするとObsidian起動時にMFDIのViewが自動で起動し、アクティブになります。"
      )
      .addToggle((tc) => {
        tc.setValue(this.plugin.settings.autoStartOnLaunch).onChange(
          async (value) => {
            this.plugin.settings.autoStartOnLaunch = value;
            await this.plugin.saveSettings();
          }
        );
      });

    new Setting(containerEl)
      .setName("リンクのカード表示")
      .setDesc("有効にすると投稿内のリンクをリッチなカード形式で表示します。")
      .addToggle((tc) => {
        tc.setValue(this.plugin.settings.enabledCardView).onChange(
          async (value) => {
            this.plugin.settings.enabledCardView = value;
            await this.plugin.saveSettings();
            this.plugin.rerenderView();
          }
        );
      });

    new Setting(containerEl)
      .setName("チャット風の表示順")
      .setDesc(
        "有効にすると投稿を下から上へ（新しい投稿が一番下）に表示します。"
      )
      .addToggle((tc) => {
        tc.setValue(this.plugin.settings.reverseOrder).onChange(
          async (value) => {
            this.plugin.settings.reverseOrder = value;
            await this.plugin.saveSettings();
            this.plugin.rerenderView();
          }
        );
      });

  }
}
