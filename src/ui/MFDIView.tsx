import { ItemView, Menu, Scope, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { Settings } from "src/settings";
import { MFDIViewHandler } from "./MFDIViewHandler";
import { ReactView } from "./ReactView";
import { Granularity, TimeFilter } from "./types";

export const VIEW_TYPE_MFDI = "mfdi-view";

// Why private?
type IconName = string;

export class MFDIView extends ItemView {
  private root: Root;
  private settings: Settings;
  public readonly handlers = new MFDIViewHandler();
  public state: MFDIViewState = {
    granularity: "day",
    asTask: false,
    timeFilter: "all",
    activeTopic: "",
  };
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
          this.handlers.onOpenDailyNoteAction?.();
        });
    });
    // menu.addItem((item) => {
    //   item
    //     .setTitle("モーダルエディタで開く")
    //     .setIcon("maximize")
    //     .onClick(() => {
    //       this.onOpenModalEditor?.();
    //     });
    // });

    // --- トピック ---
    menu.addSeparator();
    menu.addItem((item) => {
      item
        .setTitle("トピックを管理...")
        .setIcon("folder-open")
        .onClick(() => {
          this.handlers.onOpenTopicManager?.();
        });
    });

    // addGranularityMenuItems(menu, this.state.granularity, (g) => {
    //   this.handler.onChangeGranularity?.(g);
    // });

    // --- 投稿モード ---
    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle("投稿モード").setIcon("pencil").setDisabled(true);
    });
    menu.addItem((item) => {
      item
        .setTitle("メッセージ投稿モード")
        .setIcon("message-square")
        .setChecked(!this.state.asTask)
        .onClick(() => {
          this.handlers.onChangeAsTask?.(false);
        });
    });
    menu.addItem((item) => {
      item
        .setTitle("タスク投稿モード")
        .setIcon("check-circle")
        .setChecked(this.state.asTask)
        .onClick(() => {
          this.handlers.onChangeAsTask?.(true);
        });
    });

    // --- 表示期間 ---
    const showTimeFilter = this.state.granularity === "day" && !this.state.asTask;
    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle("表示期間").setIcon("clock").setDisabled(true);
    });
    const filters: TimeFilter[] = [
      "all",
      "latest",
      1, 2, 3, 6, 12,
      "this_week",
    ];
    for (const f of filters) {
      menu
      menu.addItem((item) => {
        const isChecked = showTimeFilter ? this.state.timeFilter === f : f === "all";
        item
          .setTitle(
            f === "all"
              ? "今日"
              : f === "latest"
              ? "最新のみ表示"
              : f === "this_week"
              ? "今週"
              : `直近${f}時間`
          )
          .setChecked(isChecked)
          .setDisabled(!showTimeFilter)
          .onClick(() => {
            this.handlers.onChangeTimeFilter?.(f);
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
    // scope は renderNewView より先に初期化する必要がある（MagicalEditor で親スコープとして参照されるため）
    this.scope = new Scope(this.app.scope);
    this.scope.register(["Ctrl"], "Enter", () => {
      return true;
    });
    this.scope.register(["Ctrl", "Shift", "Alt"], "o", () => {
      this.handlers.onOpenModalEditor?.();
      return true;
    });

    this.renderNewView();

    this.app.workspace.on("active-leaf-change", leaf => {
      if (leaf?.id === this.leaf.id) {
        this.handlers.onFocusRequested?.();
      }
    })
  }

  async onClose() {
    this.root?.unmount();
  }

  renderNewView() {
    if (!this.root) {
      this.root = createRoot(this.containerEl.children[1]);
    }
    this.root.render(
      <ReactView app={this.app} settings={this.settings} view={this} />
    );
  }

  updateSettings(settings: Settings) {
    this.settings = settings;
    this.renderNewView();
  }

  getState(): MFDIViewState {
    return this.state;
  }

  async setState(state: MFDIViewState) {
    this.state.granularity = (state.granularity as Granularity) ?? this.state.granularity;
    this.state.asTask = (state.asTask as boolean) ?? this.state.asTask;
    this.state.timeFilter = (state.timeFilter as TimeFilter) ?? this.state.timeFilter;
    if (state.activeTopic !== undefined) {
      this.state.activeTopic = state.activeTopic as string;
      this.handlers.onChangeTopic?.(this.state.activeTopic);
    }
    this.renderNewView();
  }
}

interface MFDIViewState extends Record<string, unknown> {
  granularity: Granularity;
  asTask: boolean;
  timeFilter: TimeFilter;
  activeTopic: string;
}
