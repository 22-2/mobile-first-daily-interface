import { ItemView, Menu, Scope, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { Settings } from "../../settings";
import { ReactView } from "../components/layout/ReactView";
import { addPeriodMenuItems } from "../menus/periodMenu";
import { addPostModeMenuItems } from "../menus/postModeMenu";
import { DateFilter, DisplayMode, Granularity, TimeFilter } from "../types";
import { MFDIViewHandler } from "./MFDIViewHandler";

export const VIEW_TYPE_MFDI = "mfdi-view";

// Why private?
type IconName = string;

export class MFDIView extends ItemView {
  private root: Root;
  private settings: Settings;
  public readonly handlers = new MFDIViewHandler();
  public state: MFDIViewState = {
    displayMode: "focus",
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
        .setTitle(
          this.state.displayMode === "focus"
            ? "タイムライン表示に切替"
            : "フォーカス表示に切替",
        )
        .setIcon(
          this.state.displayMode === "focus" ? "list-minus" : "calendar-range",
        )
        .onClick(() => {
          this.handlers.onChangeDisplayMode?.(
            this.state.displayMode === "focus" ? "timeline" : "focus",
          );
        });
    });

    menu.addSeparator();

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

    // --- 表示期間（日／時間） ---
    addPeriodMenuItems(menu, this.state, {
      onChangeTimeFilter: (f) => this.handlers.onChangeTimeFilter?.(f),
      onChangeDateFilter: (f) => this.handlers.onChangeDateFilter?.(f),
    });

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

    this.addAction("columns-2", "サイドバーを切り替え", () => {
      this.handlers.onToggleSidebar?.();
    });

    this.renderNewView();

    this.app.workspace.on("active-leaf-change", (leaf) => {
      if (leaf?.id === this.leaf.id) {
        this.handlers.onFocusRequested?.();
      }
    });
  }

  async onClose() {
    this.root?.unmount();
  }

  renderNewView() {
    if (!this.root) {
      this.root = createRoot(this.containerEl.children[1]);
    }
    this.root.render(
      <ReactView app={this.app} settings={this.settings} view={this} />,
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
    this.state.granularity =
      (state.granularity as Granularity) ?? this.state.granularity;
    this.state.asTask = (state.asTask as boolean) ?? this.state.asTask;
    this.state.timeFilter =
      (state.timeFilter as TimeFilter) ?? this.state.timeFilter;
    this.state.dateFilter =
      (state.dateFilter as DateFilter) ?? this.state.dateFilter;
    if (state.displayMode !== undefined) {
      this.state.displayMode = state.displayMode as DisplayMode;
    }
    if (state.activeTopic !== undefined) {
      this.state.activeTopic = state.activeTopic as string;
      this.handlers.onChangeTopic?.(this.state.activeTopic);
    }
    this.renderNewView();
  }
}

interface MFDIViewState extends Record<string, unknown> {
  displayMode: DisplayMode;
  granularity: Granularity;
  asTask: boolean;
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  activeTopic: string;
}
