import { ItemView, WorkspaceLeaf, Menu } from "obsidian";
import * as React from "react";
import { ReactView } from "./ReactView";
import { createRoot, Root } from "react-dom/client";
import { AppHelper } from "../app-helper";
import { Settings } from "src/settings";
import { Granularity } from "./types";
import { granularityConfig } from "./granularity-config";

export const VIEW_TYPE_MFDI = "mfdi-view";

// Why private?
type IconName = string;


export class MFDIView extends ItemView {
  private root: Root;
  private settings: Settings;
  public onOpenDailyNoteAction?: () => void;
  public granularity: Granularity = "day";
  public onChangeGranularity?: (g: Granularity) => void;

  constructor(leaf: WorkspaceLeaf, settings: Settings) {
    super(leaf);
    this.settings = settings;
  }

  onPaneMenu(menu: Menu, prev: string): void {
    menu.addItem((item) => {
      item
        .setTitle("現在のデイリーノートを開く")
        .setIcon("external-link")
        .onClick(() => {
          this.onOpenDailyNoteAction?.();
        });
    });

    // --- 年月日の表示形式 ---
    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle("年月日の表示形式").setIcon("calendar").setDisabled(true);
    });
    const granularities: Granularity[] = ["day", "week", "month", "year"];
    for (const g of granularities) {
      menu.addItem((item) => {
        item
          .setTitle(granularityConfig[g].menuLabel)
          .setChecked(this.granularity === g)
          .onClick(() => {
            this.onChangeGranularity?.(g);
          });
      });
    }

    super.onPaneMenu(menu, prev);
  }

  getIcon(): IconName {
    return "pencil";
  }

  getViewType() {
    return VIEW_TYPE_MFDI;
  }

  getDisplayText() {
    return "Mobile First Daily Interface";
  }

  async onOpen() {
    this.renderNewView();
  }

  async onClose() {
    this.root.unmount();
  }

  renderNewView() {
    this.root = createRoot(this.containerEl.children[1]);
    this.root.render(
      <ReactView app={this.app} settings={this.settings} view={this} />
    );
  }

  updateSettings(settings: Settings) {
    this.settings = settings;
    this.root.unmount();
    this.renderNewView();
  }
}
