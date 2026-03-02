import { ItemView, Menu, Scope, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { Settings } from "src/settings";
import { granularityConfig } from "./granularity-config";
import { ReactView } from "./ReactView";
import { TimeFilter, Granularity } from "./types";

export const VIEW_TYPE_MFDI = "mfdi-view";

// Why private?
type IconName = string;


export class MFDIView extends ItemView {
  private root: Root;
  private settings: Settings;
  public onOpenDailyNoteAction?: () => void;
  public granularity: Granularity = "day";
  public onChangeGranularity?: (g: Granularity) => void;
  public asTask: boolean = false;
  public onChangeAsTask?: (asTask: boolean) => void;
  public timeFilter: TimeFilter = "all";
  public onChangeTimeFilter?: (f: TimeFilter) => void;
  public onOpenModalEditor?: () => void;
  public navigation: boolean = false;

  constructor(leaf: WorkspaceLeaf, settings: Settings) {
    super(leaf);
    this.settings = settings;
  }

  onPaneMenu(menu: Menu, prev: string): void {
    menu.addItem((item) => {
      item
        .setTitle("現在のノートを開く")
        .setIcon("external-link")
        .onClick(() => {
          this.onOpenDailyNoteAction?.();
        });
    });
    menu.addItem((item) => {
      item
        .setTitle("モーダルエディタで開く")
        .setIcon("maximize")
        .onClick(() => {
          this.onOpenModalEditor?.();
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

    // --- 投稿モード ---
    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle("投稿モード").setIcon("pencil").setDisabled(true);
    });
    menu.addItem((item) => {
      item
        .setTitle("メッセージ投稿モード")
        .setIcon("message-square")
        .setChecked(!this.asTask)
        .onClick(() => {
          this.onChangeAsTask?.(false);
        });
    });
    menu.addItem((item) => {
      item
        .setTitle("タスク投稿モード")
        .setIcon("check-circle")
        .setChecked(this.asTask)
        .onClick(() => {
          this.onChangeAsTask?.(true);
        });
    });

    // --- 表示期間 ---
    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle("表示期間").setIcon("clock").setDisabled(true);
    });
    const filters: TimeFilter[] = [1, 2, 3, 6, 12, "all"];
    for (const f of filters) {
      menu.addItem((item) => {
        item
          .setTitle(f === "all" ? "すべて表示" : `直近${f}時間`)
          .setChecked(this.timeFilter === f)
          .setDisabled(this.granularity !== "day")
          .onClick(() => {
            this.onChangeTimeFilter?.(f);
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
    // Ctrl+Shift+Alt+O でモーダルエディタを開く（thino-extension と同じショートカット）
    this.scope = new Scope(this.app.scope);
    this.scope?.register(["Ctrl", "Shift", "Alt"], "o", () => {
      this.onOpenModalEditor?.();
      return true;
    });
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
