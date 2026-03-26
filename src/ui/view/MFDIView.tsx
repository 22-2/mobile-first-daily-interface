import type { Menu, WorkspaceLeaf } from "obsidian";
import { ItemView, Scope, TFile } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import type { Settings } from "src/settings";
import { EditableTitleBar } from "src/ui/components/EditableTitleBar";
import { ReactView } from "src/ui/components/layout/ReactView";
import { addPeriodMenuItems } from "src/ui/menus/periodMenu";
import { MFDIViewHandler } from "src/ui/view/MFDIViewHandler";
import type {
  MFDIViewState} from "src/ui/view/state";
import {
  DEFAULT_MFDI_VIEW_STATE,
  getFixedNoteTitle,
  getMFDIViewCapabilities
} from "src/ui/view/state";
import { ensureExtension } from "src/core/path";

export const VIEW_TYPE_MFDI = "mfdi-view";

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

  // -----------------------------------------------------------------------
  // ItemView overrides
  // -----------------------------------------------------------------------

  getIcon(): string {
    return "pencil";
  }

  getViewType(): string {
    return VIEW_TYPE_MFDI;
  }

  getDisplayText(): string {
    if (this.state.noteMode === "fixed") {
      return `MFDI: ${getFixedNoteTitle(this.state.fixedNotePath)}`;
    }
    return "Mobile First Daily Interface";
  }

  async onOpen(): Promise<void> {
    this.setupHandlers();
    // fixedノートを開いたときなど、すぐに render せずに少し待つ。
    // これをしないと、DateNavigation が表示されてしまうなど、状態の反映が不完全なまま描画されてしまう。
    window.setTimeout(() => this.setupView());
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
  }

  onPaneMenu(menu: Menu, prev: string): void {
    this.addFixedNoteMenuItems(menu);
    this.addViewMenuItems(menu);
    this.addPeriodMenuItemsIfSupported(menu);
    if (this.state.noteMode === "fixed") {
      // delete fixed note menu
      menu.addSeparator();
      menu.addItem((item) => {
        item
          .setTitle("削除")
          .setIcon("trash")
          .setWarning(true)
          .onClick(async () => {
            const file = this.app.metadataCache.getFirstLinkpathDest(
              this.state.fixedNotePath!,
              "",
            );
            if (file instanceof TFile) {
              this.app.fileManager.trashFile(file);
            }
          });
      });
    }
    super.onPaneMenu(menu, prev);
  }

  // -----------------------------------------------------------------------
  // State management
  // -----------------------------------------------------------------------

  getState(): MFDIViewState {
    return this.state;
  }

  setStatePartial(patch: Partial<MFDIViewState>): void {
    this.state = {
      ...this.state,
      ...patch,
      // patch に含まれない場合は既存値を維持（スプレッドで上書きされるが明示）
      noteMode: patch.noteMode ?? this.state.noteMode,
      fixedNotePath:
        patch.fixedNotePath !== undefined
          ? (patch.fixedNotePath as string | null)
          : this.state.fixedNotePath,
    };
  }

  async setState(state: MFDIViewState): Promise<void> {
    this.setStatePartial(state);

    if (state.activeTopic !== undefined) {
      this.state.activeTopic = state.activeTopic as string;
      this.handlers.onChangeTopic?.(this.state.activeTopic);
    }

    this.render();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.render();
  }

  // -----------------------------------------------------------------------
  // Private: setup
  // -----------------------------------------------------------------------

  private setupHandlers(): void {
    // scope は render より先に初期化する必要がある（MagicalEditor で親スコープとして参照されるため）
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
      this.editableTitleBar?.focus();
      return false;
    });

    this.app.workspace.on("active-leaf-change", (leaf) => {
      if (leaf?.id === this.leaf.id) {
        this.handlers.onFocusRequested?.();
      }
    });
  }

  private setupView(): void {
    const capabilities = getMFDIViewCapabilities(this.state);

    if (capabilities.supportsSidebar) {
      this.addAction("columns-2", "サイドバーを切り替え", () => {
        this.handlers.onToggleSidebar?.();
      });
    }

    if (this.state.noteMode === "fixed") {
      this.setupEditableTitleBar();
    }

    this.render();
  }

  private setupEditableTitleBar(): void {
    this.editableTitleBar = new EditableTitleBar(this, {
      scope: new Scope(this.app.scope),
      getTitle: () => getFixedNoteTitle(this.state.fixedNotePath),
      onSubmitTitle: async (newTitle: string) => {
        if (!this.state.fixedNotePath || !newTitle.trim()) return;

        const file = this.app.vault.getAbstractFileByPath(
          this.state.fixedNotePath,
        ) as TFile | null;

        if (!file) return;

        await this.app.fileManager.renameFile(
          file,
          ensureExtension(newTitle, ".mfdi.md"),
        );
        this.state.fixedNotePath = file.path;
        this.render();
      },
    });
    this.editableTitleBar.render();
  }

  private render(): void {
    if (!this.root) {
      this.root = createRoot(this.containerEl.children[1]);
    }
    this.root.render(
      <ReactView app={this.app} settings={this.settings} view={this} />,
    );
  }

  // -----------------------------------------------------------------------
  // Private: menu builders
  // -----------------------------------------------------------------------

  private addFixedNoteMenuItems(menu: Menu): void {
    if (this.state.noteMode !== "fixed") return;

    menu.addItem((item) =>
      item
        .setTitle("現在のノートを開く")
        .setIcon("external-link")
        .onClick(() => this.handlers.onOpenDailyNoteAction?.()),
    );
  }

  private addViewMenuItems(menu: Menu): void {
    const capabilities = getMFDIViewCapabilities(this.state);

    menu.addItem((item) =>
      item
        .setTitle("すべてのメッセージをコピー")
        .setIcon("copy")
        .onClick(() => this.handlers.onCopyAllPosts?.()),
    );

    menu.addSeparator();

    menu.addItem((item) =>
      item.setTitle("ビュー").setIcon("panels-top-left").setDisabled(true),
    );

    menu.addItem((item) =>
      item
        .setTitle("下書きを管理")
        .setIcon("library")
        .onClick(() => this.handlers.onOpenDraftList?.()),
    );

    if (capabilities.supportsDisplayModeSwitch) {
      const isFocus = this.state.displayMode === "focus";
      menu.addItem((item) =>
        item
          .setTitle(isFocus ? "フォーカスモード" : "タイムラインモード")
          .setIcon(isFocus ? "toggle-left" : "toggle-right")
          .onClick(() =>
            this.handlers.onChangeDisplayMode?.(isFocus ? "timeline" : "focus"),
          ),
      );
    }

    menu.addItem((item) =>
      item
        .setTitle(this.state.asTask ? "タスクモード" : "メッセージモード")
        .setIcon(this.state.asTask ? "toggle-left" : "toggle-right")
        .onClick(() => this.handlers.onChangeAsTask?.(!this.state.asTask)),
    );
  }

  private addPeriodMenuItemsIfSupported(menu: Menu): void {
    const capabilities = getMFDIViewCapabilities(this.state);
    if (!capabilities.supportsPeriodMenus) return;
    if (this.state.displayMode !== "focus") return;

    addPeriodMenuItems(menu, this.state, {
      onChangeTimeFilter: (f) => this.handlers.onChangeTimeFilter?.(f),
      onChangeDateFilter: (f) => this.handlers.onChangeDateFilter?.(f),
    });
  }
}
