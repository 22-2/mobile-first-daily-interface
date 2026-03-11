import { App, PluginSettingTab, Setting } from "obsidian";
import MFDIPlugin from "src/main";
import { DEFAULT_TOPIC, Topic } from "src/topic";

export interface Settings {
  postFormatOption: PostFormatOption;
  insertAfter: string;
  enabledCardView: boolean;
  updateDateStrategy: "never" | "always" | "same_day";
  topics: Topic[];
  activeTopic: string;
}

export const DEFAULT_SETTINGS: Settings = {
  postFormatOption: "Thino",
  insertAfter: "## Thino",
  enabledCardView: true,
  updateDateStrategy: "never",
  topics: [DEFAULT_TOPIC],
  activeTopic: "",
};

export const postFormatMap = {
  Thino: { type: "thino" },
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
      .setName("挿入位置 (文字列の後ろ)")
      .setDesc(
        "指定した文字列がファイル内にある場合、その直後に投稿内容を挿入します。空の場合はファイルの末尾に挿入します。",
      )
      .addText((tc) =>
        tc
          .setPlaceholder("## MFDI")
          .setValue(this.plugin.settings.insertAfter)
          .onChange(async (value) => {
            this.plugin.settings.insertAfter = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("リンクのカード表示")
      .setDesc("有効にすると投稿内のリンクをリッチなカード形式で表示します。")
      .addToggle((tc) => {
        tc.setValue(this.plugin.settings.enabledCardView).onChange(
          async (value) => {
            this.plugin.settings.enabledCardView = value;
            await this.plugin.saveSettings();
            this.plugin.rerenderView();
          },
        );
      });

    new Setting(containerEl)
      .setName("更新時の日時更新ストラテジ")
      .setDesc(
        "編集で更新したときに日時を更新する条件を選択します。（「その日の間だけ」は日付が変わった時点で更新されなくなります）",
      )
      .addDropdown((tc) =>
        tc
          .addOption("never", "常に更新しない（デフォルト）")
          .addOption("always", "常に更新する")
          .addOption("same_day", "その日の間だけ更新する")
          .setValue(this.plugin.settings.updateDateStrategy)
          .onChange(async (value) => {
            this.plugin.settings.updateDateStrategy =
              value as Settings["updateDateStrategy"];
            await this.plugin.saveSettings();
          }),
      );
  }
}
