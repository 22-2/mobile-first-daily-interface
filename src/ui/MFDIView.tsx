import { Editor, ItemView, Menu, Scope, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { Settings } from "src/settings";
import { ReactView } from "./ReactView";
import { Granularity, TimeFilter } from "./types";

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
  public onSubmit?: () => Promise<void>;
  public activeTopic: string = "";
  public onChangeTopic?: (topicId: string) => void;
  public onTopicSaveRequested?: (topicId: string) => Promise<void>;
  public onOpenTopicManager?: () => void;
  public onFocusRequested?: () => void;

  constructor(leaf: WorkspaceLeaf, settings: Settings) {
    super(leaf);
    this.settings = settings;
  }

  public editor?: Editor;

  onPaneMenu(menu: Menu, prev: string): void {
    menu.addItem((item) => {
      item
        .setTitle("現在のノートを開く")
        .setIcon("external-link")
        .onClick(() => {
          this.onOpenDailyNoteAction?.();
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
          this.onOpenTopicManager?.();
        });
    });

    // addGranularityMenuItems(menu, this.granularity, (g) => {
    //   this.onChangeGranularity?.(g);
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
    const showTimeFilter = this.granularity === "day" && !this.asTask;
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
        const isChecked = showTimeFilter ? this.timeFilter === f : f === "all";
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
    // scope は renderNewView より先に初期化する必要がある（MagicalEditor で親スコープとして参照されるため）
    this.scope = new Scope(this.app.scope);
    this.scope.register(["Ctrl"], "Enter", () => {
      return true;
    });
    this.scope.register(["Ctrl", "Shift", "Alt"], "o", () => {
      this.onOpenModalEditor?.();
      return true;
    });

    this.renderNewView();

    this.app.workspace.on("active-leaf-change", leaf => {
      if (leaf?.id === this.leaf.id) {
        this.onFocusRequested?.();
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
    return {
      granularity: this.granularity,
      asTask: this.asTask,
      timeFilter: this.timeFilter,
      activeTopic: this.activeTopic,
    };
  }

  async setState(state: MFDIViewState) {
    this.granularity = (state.granularity as Granularity) ?? this.granularity;
    this.asTask = (state.asTask as boolean) ?? this.asTask;
    this.timeFilter = (state.timeFilter as TimeFilter) ?? this.timeFilter;
    if (state.activeTopic !== undefined) {
      this.activeTopic = state.activeTopic as string;
      this.onChangeTopic?.(this.activeTopic);
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
