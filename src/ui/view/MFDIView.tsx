import { ItemView, Menu, Scope, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { Settings } from "src/settings";
import { DateFilter, Granularity, TimeFilter } from "../types";
import { ReactView } from "../components/layout/ReactView";
import { DATE_FILTER_OPTIONS, TIME_FILTER_OPTIONS } from "../config/filter-config";
import { addPostModeMenuItems } from "../menus/postModeMenu";
import { MFDIViewHandler } from "./MFDIViewHandler";

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
    dateFilter: "today",
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

    // --- 投稿モード ---
    menu.addSeparator();
    addPostModeMenuItems(menu, this.state.asTask, (asTask) => {
      this.handlers.onChangeAsTask?.(asTask);
    });

    // --- 表示期間（時間） ---
    const showTimeFilter = this.state.granularity === "day" && !this.state.asTask;
    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle("表示期間（時間）").setIcon("clock").setDisabled(true);
    });
    for (const f of TIME_FILTER_OPTIONS) {
      menu.addItem((item) => {
        const isChecked = showTimeFilter ? this.state.timeFilter === f.id : f.id === "all";
        item
          .setTitle(f.label)
          .setChecked(isChecked)
          .setDisabled(!showTimeFilter)
          .onClick(() => {
            this.handlers.onChangeTimeFilter?.(f.id);
          });
      });
    }

    // --- 表示期間（日） ---
    const showDateFilter = this.state.granularity === "day" && !this.state.asTask;
    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle("表示期間（日）").setIcon("calendar").setDisabled(true);
    });
    for (const f of DATE_FILTER_OPTIONS) {
      menu.addItem((item) => {
        const isChecked = showDateFilter ? this.state.dateFilter === f.id : f.id === "today";
        item
          .setTitle(f.label)
          .setChecked(isChecked)
          .setDisabled(!showDateFilter)
          .onClick(() => {
            this.handlers.onChangeDateFilter?.(f.id);
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
    this.state.dateFilter = (state.dateFilter as DateFilter) ?? this.state.dateFilter;
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
  dateFilter: DateFilter;
  activeTopic: string;
}
