import { ItemView, Menu, Scope, Setting, TFile, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import { Root, createRoot } from "react-dom/client";
import { Settings } from "src/settings";
import { ReactView } from "src/ui/components/layout/ReactView";
import { addPeriodMenuItems } from "src/ui/menus/periodMenu";
import { MFDIViewHandler } from "src/ui/view/MFDIViewHandler";
import {
  DEFAULT_MFDI_VIEW_STATE,
  MFDIViewState,
  getFixedNoteTitle,
  getMFDIViewCapabilities,
} from "src/ui/view/state";
import { EditableTitleBar } from "../components/EditableTitleBar";
import { ensureExtension } from "src/utils/path";

export const VIEW_TYPE_MFDI = "mfdi-view";

// Why private?
type IconName = string;

export class MFDIView extends ItemView {
  private editableTitleBar: EditableTitleBar | null = null;
  private root: Root;
  private settings: Settings;
  private state: MFDIViewState = { ...DEFAULT_MFDI_VIEW_STATE };
  public navigation: boolean = false;
  public readonly handlers = new MFDIViewHandler();

  constructor(leaf: WorkspaceLeaf, settings: Settings) {
    super(leaf);
    this.settings = settings;
  }

  onPaneMenu(menu: Menu, prev: string): void {
    const capabilities = getMFDIViewCapabilities(this.state);

    if (this.state.noteMode === "fixed") {
      menu.addItem((item) => {
        item
          .setTitle("現在のノートを開く")
          .setIcon("external-link")
          .onClick(() => {
            this.handlers.onOpenDailyNoteAction?.();
          });
      });
    }

    menu.addItem((item) => {
      item
        .setTitle("すべてのメッセージをコピー")
        .setIcon("copy")
        .onClick(() => {
          this.handlers.onCopyAllPosts?.();
        });
    });

    // --- 表示モード ---
    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle("ビュー").setIcon("panels-top-left").setDisabled(true);
    });
    menu.addItem((item) => {
      item
        .setTitle("下書きを管理")
        .setIcon("library")
        .onClick(() => {
          this.handlers.onOpenDraftList?.();
        });
    });

    if (capabilities.supportsDisplayModeSwitch) {
      menu.addItem((item) => {
        item
          .setTitle(
            this.state.displayMode === "focus"
              ? "フォーカスモード"
              : "タイムラインモード",
          )
          .setIcon(
            this.state.displayMode === "focus" ? "toggle-left" : "toggle-right",
          )
          .onClick(() => {
            this.handlers.onChangeDisplayMode?.(
              this.state.displayMode === "focus" ? "timeline" : "focus",
            );
          });
      });
    }

    menu.addItem((item) => {
      item
        .setTitle(this.state.asTask ? "タスクモード" : "メッセージモード")
        .setIcon(this.state.asTask ? "toggle-left" : "toggle-right")
        .onClick(() => {
          this.handlers.onChangeAsTask?.(!this.state.asTask);
        });
    });

    // --- 表示期間（日／時間） ---
    if (
      capabilities.supportsPeriodMenus &&
      this.state.displayMode === "focus"
    ) {
      addPeriodMenuItems(menu, this.state, {
        onChangeTimeFilter: (f) => this.handlers.onChangeTimeFilter?.(f),
        onChangeDateFilter: (f) => this.handlers.onChangeDateFilter?.(f),
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
    if (this.state.noteMode === "fixed") {
      return `MFDI: ${getFixedNoteTitle(this.state.fixedNotePath)}`;
    }
    return "Mobile First Daily Interface";
  }

  async onOpen() {
    this.setupHandlers();
    // fixedノートを開いたときなど、すぐに render せずに少し待つ。
    // これをしないと、Datenavigationが表示されてしまうなど、状態の反映が不完全なまま描画されてしまう。
    window.setTimeout(() => this.setupView());
  }

  async onClose() {
    this.root?.unmount();
  }

  getState(): MFDIViewState {
    return this.state;
  }

  setStatePartial(state: Partial<MFDIViewState>) {
    this.state = {
      ...this.state,
      ...state,
      noteMode: state.noteMode ?? this.state.noteMode,
      fixedNotePath:
        state.fixedNotePath !== undefined
          ? (state.fixedNotePath as string | null)
          : this.state.fixedNotePath,
    };
  }

  async setState(state: MFDIViewState) {
    this.setStatePartial(state);
    if (state.activeTopic !== undefined) {
      this.state.activeTopic = state.activeTopic as string;
      this.handlers.onChangeTopic?.(this.state.activeTopic);
    }
    this.render();
  }

  private setupHandlers() {
    // scope は renderNewView より先に初期化する必要がある（MagicalEditor で親スコープとして参照されるため）
    this.scope = new Scope(this.app.scope);
    this.scope.register(["Ctrl"], "Enter", () => {
      this.handlers.onSubmit?.();
      return false;
    });
    this.scope.register(["Ctrl", "Shift", "Alt"], "o", () => {
      this.handlers.onOpenModalEditor?.();
      return true;
    });
    this.scope.register([], "F2", () => {
      if (this.editableTitleBar) {
        this.editableTitleBar.focus();
        return false;
      }
    });
    this.app.workspace.on("active-leaf-change", (leaf) => {
      if (leaf?.id === this.leaf.id) {
        this.handlers.onFocusRequested?.();
      }
    });
  }

  private setupView() {
    if (getMFDIViewCapabilities(this.state).supportsSidebar) {
      this.addAction("columns-2", "サイドバーを切り替え", () => {
        this.handlers.onToggleSidebar?.();
      });
    }

    if (this.state.noteMode === "fixed") {
      this.editableTitleBar = new EditableTitleBar(this, {
        getTitle: () => getFixedNoteTitle(this.state.fixedNotePath),
        onSubmitTitle: async (newTitle: string) => {
          if (!this.state.fixedNotePath) return;
          if (!newTitle.trim().length) return;
          const file = this.app.vault.getAbstractFileByPath(
            this.state.fixedNotePath!,
          ) as TFile | null;
          if (!file) return;
          // Handle the title submission here
          this.app.fileManager.renameFile(
            file,
            ensureExtension(newTitle, ".mfdi.md"),
          );
          this.state.fixedNotePath = file.path;
          this.render();
        },
      });
      this.editableTitleBar.render();
    }
    // const search = new Setting(createDiv())
    //   .addSearch(search => search
    //     .setClass("mfdi-search")
    //     .setPlaceholder("Search...")
    //     .onChange(val => {

    //     })
    //   );
    // this.actionsEl.prepend(search.controlEl);
    this.render();
  }

  private render() {
    if (!this.root) {
      this.root = createRoot(this.containerEl.children[1]);
    }
    this.root.render(
      <ReactView app={this.app} settings={this.settings} view={this} />,
    );
  }

  public updateSettings(settings: Settings) {
    this.settings = settings;
    this.render();
  }
}
