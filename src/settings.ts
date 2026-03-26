import { App, PluginSettingTab, Setting } from "obsidian";
import MFDIPlugin from "src/main";
import { DEFAULT_TOPIC, Topic } from "src/core/topic";

export interface Settings {
  postFormatOption: PostFormatOption;
  insertAfter: string;
  enabledCardView: boolean;
  allowEditingPastNotes: boolean;
  updateDateStrategy: "never" | "always" | "same_day";
  topics: Topic[];
  activeTopic: string;
  fixedNoteFiles: { path: string }[];
}

export const DEFAULT_SETTINGS: Settings = {
  postFormatOption: "Thino",
  insertAfter: "## Thino",
  enabledCardView: true,
  allowEditingPastNotes: false,
  updateDateStrategy: "never",
  topics: [DEFAULT_TOPIC],
  activeTopic: "",
  fixedNoteFiles: [],
};

export const postFormatMap = {
  Thino: { type: "thino" },
} as const;
export type PostFormatOption = keyof typeof postFormatMap;
type PostFormat = (typeof postFormatMap)[PostFormatOption];

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
    this.addGeneralSettings(containerEl);
  }

  private async updateSetting<K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ): Promise<void> {
    this.plugin.settings = { ...this.plugin.settings, [key]: value };
    await this.plugin.saveSettings();
  }

  private addToggleSetting(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    key: keyof Pick<Settings, "enabledCardView" | "allowEditingPastNotes">,
    rerenderOnChange = false,
  ): void {
    new Setting(containerEl)
      .setName(name)
      .setDesc(desc)
      .addToggle((tc) =>
        tc.setValue(this.plugin.settings[key]).onChange(async (value) => {
          await this.updateSetting(key, value);
          if (rerenderOnChange) this.plugin.rerenderView();
        }),
      );
  }

  private addGeneralSettings(containerEl: HTMLElement): void {
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
            await this.updateSetting("insertAfter", value);
          }),
      );

    this.addToggleSetting(
      containerEl,
      "リンクのカード表示",
      "有効にすると投稿内のリンクをリッチなカード形式で表示します。",
      "enabledCardView",
      true,
    );

    this.addToggleSetting(
      containerEl,
      "過去ノートの編集を許可",
      "有効にすると、過去日のノートも編集でき、過去投稿の dim 表示も無効になります。",
      "allowEditingPastNotes",
      true,
    );

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
            await this.updateSetting(
              "updateDateStrategy",
              value as Settings["updateDateStrategy"],
            );
          }),
      );
  }
}
