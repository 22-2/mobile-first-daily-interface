import type { WorkspaceLeaf } from "obsidian";
import { ItemView, Menu, Scope, Setting, TFile } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { ensureExtension } from "src/core/path";
import type { Settings } from "src/settings";
import { EditableTitleBar } from "src/ui/components/common/EditableTitleBar";
import { ReactView } from "src/ui/components/layout/ReactView";
import { addPeriodMenuItems } from "src/ui/menus/periodMenu";
import "src/ui/styles/global.css";
import "src/ui/styles/mfdi.css";
import type { MFDIActionDelegate } from "src/ui/view/MFDIViewHandler";
import type { MFDIViewState } from "src/ui/view/state";
import {
  DEFAULT_MFDI_VIEW_STATE,
  getFixedNoteTitle,
  getMFDIViewCapabilities,
} from "src/ui/view/state";

export const VIEW_TYPE_MFDI = "mfdi-view";

export class MFDIView extends ItemView {
  private editableTitleBar: EditableTitleBar | null = null;
  private root: Root;
  private settings: Settings;
  // 検索入力用のコントロール要素を保持しておく
  private activeSearchControlEl: HTMLElement | null = null;
  private searchInputEl: HTMLInputElement | null = null;
  private isSearchToggleFromAction = false;
  private state: MFDIViewState = { ...DEFAULT_MFDI_VIEW_STATE };
  public navigation: boolean = false;
  public readonly actionDelegates: MFDIActionDelegate = {};

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
      return `MFDI: ${getFixedNoteTitle(this.state.file)}`;
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
              this.state.file!,
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
      file:
        patch.file !== undefined
          ? (patch.file as string | null)
          : this.state.file,
    };
  }

  async setState(state: MFDIViewState): Promise<void> {
    this.setStatePartial(state);

    if (state.activeTopic !== undefined) {
      this.state.activeTopic = state.activeTopic as string;
      this.actionDelegates.onChangeTopic?.(this.state.activeTopic);
    }

    this.setupView();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.setupView();
  }

  // -----------------------------------------------------------------------
  // Private: setup
  // -----------------------------------------------------------------------

  private setupHandlers(): void {
    // scope は render より先に初期化する必要がある（MagicalEditor で親スコープとして参照されるため）
    this.scope = new Scope(this.app.scope);

    this.scope.register(["Ctrl"], "Enter", () => {
      this.actionDelegates.onSubmit?.();
      return false;
    });
    this.scope.register(["Ctrl"], "f", () => {
      this.actionDelegates.onSearchInputOpen?.();
    });

    this.scope.register(["Ctrl", "Shift", "Alt"], "o", () => {
      this.actionDelegates.onEditorExpand?.();
      return true;
    });

    this.scope.register([], "F2", () => {
      this.editableTitleBar?.focus();
      return false;
    });

    // 検索入力がフォーカスされているときに Escape キーで検索入力を閉じる
    this.scope.register([], "Escape", () => {
      if (document.activeElement === this.searchInputEl) {
        this.actionDelegates.onSearchInputClose?.();
        this.closeSearchInput();
        return true;
      }
      return false;
    });

    this.app.workspace.on("active-leaf-change", (leaf) => {
      if (leaf?.id === this.leaf.id) {
        this.actionDelegates.onFocusRequested?.();
      }
    });
  }

  private cleanUpActions(): void {
    Array.from(this.actionsEl.children)
      .filter((el) => el.getAttr("data-mfdi-actions") === "true")
      .forEach((el) => el.detach());
  }

  private ensureSearchControl(): void {
    if (this.activeSearchControlEl) return;

    const searchSetting = new Setting(createDiv()).addSearch((search) => {
      this.searchInputEl = search.inputEl;
      search.setValue(this.state.searchQuery);
      search.onChange((value) => {
        this.state.searchQuery = value;
        this.actionDelegates.onSearchQueryChange?.(value);
      });

      search.inputEl.addEventListener("blur", () => {
        if (this.isSearchToggleFromAction) return;
        this.actionDelegates.onSearchInputClose?.();
        this.closeSearchInput();
      });
    });

    this.activeSearchControlEl = searchSetting.controlEl;
    this.activeSearchControlEl.setCssStyles({
      display: "none",
    });
    this.actionsEl.prepend(searchSetting.controlEl);
  }

  public openSearchInput(): void {
    this.ensureSearchControl();
    if (!this.activeSearchControlEl) return;

    this.activeSearchControlEl.setCssStyles({
      display: "block",
    });
    window.setTimeout(() => {
      this.searchInputEl?.focus();
    });
  }

  public closeSearchInput(): void {
    if (!this.activeSearchControlEl) return;

    this.activeSearchControlEl.setCssStyles({
      display: "none",
    });
  }

  private setupView(): void {
    this.cleanUpActions();
    const capabilities = getMFDIViewCapabilities(this.state);

    if (capabilities.supportsSidebar) {
      this.addAction("columns-2", "サイドバーを切り替え", () => {
        this.actionDelegates.onToggleSidebar?.();
      }).setAttr("data-mfdi-actions", "true");
    }

    // 検索UIをトグル表示。既に開いていれば閉じる。
    const searchActionEl = this.addAction("search", "検索切り替え", () => {
      if (this.activeSearchControlEl?.style.display !== "none") {
        this.actionDelegates.onSearchInputClose?.();
        this.closeSearchInput();
        this.isSearchToggleFromAction = false;
        return;
      }
      this.actionDelegates.onSearchInputOpen?.();
      this.openSearchInput();
      this.isSearchToggleFromAction = false;
    });
    searchActionEl.addEventListener("mousedown", () => {
      if (this.activeSearchControlEl?.style.display !== "none") {
        this.isSearchToggleFromAction = true;
      }
    });
    searchActionEl.setAttr("data-mfdi-actions", "true");

    searchActionEl.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const menu = new Menu();
      const applySearchKindFilter = (params: { threadOnly: boolean }) => {
        // View側の状態を先に同期し、右クリックメニューのチェック状態と実データをずらさない。
        this.state.threadOnly = params.threadOnly;
        this.actionDelegates.onChangeThreadOnly?.(params.threadOnly);
      };

      menu.addItem((item) =>
        item
          .setTitle("すべて")
          .setChecked(!this.state.threadOnly)
          .onClick(() => applySearchKindFilter({ threadOnly: false })),
      );

      menu.addSeparator();

      menu.addItem((item) =>
        item
          .setTitle("スレッドのみ")
          .setChecked(this.state.threadOnly)
          .onClick(() => applySearchKindFilter({ threadOnly: true })),
      );

      menu.showAtMouseEvent(e.nativeEvent);
    });

    if (this.state.noteMode === "fixed") {
      this.setupEditableTitleBar();
    }

    const _render = () => {
      if (!this.root) {
        this.root = createRoot(this.containerEl.children[1]);
      }
      this.root.render(
        <ReactView app={this.app} settings={this.settings} view={this} />,
      );
    };
    _render();
  }

  private setupEditableTitleBar(): void {
    this.editableTitleBar = new EditableTitleBar(this, {
      scope: new Scope(this.app.scope),
      getTitle: () => getFixedNoteTitle(this.state.file),
      onSubmitTitle: async (newTitle: string) => {
        if (!this.state.file || !newTitle.trim()) return;

        const file = this.app.vault.getAbstractFileByPath(
          this.state.file,
        ) as TFile | null;

        if (!file) return;

        await this.app.fileManager.renameFile(
          file,
          ensureExtension(newTitle, ".mfdi.md"),
        );
        this.state.file = file.path;
        this.setupView();
      },
    });
    this.editableTitleBar.render();
  }

  // -----------------------------------------------------------------------
  // Private: menu builders
  // -----------------------------------------------------------------------

  private addFixedNoteMenuItems(menu: Menu): void {
    if (this.state.displayMode === "timeline") return;

    menu.addItem((item) =>
      item
        .setTitle("現在のノートを開く")
        .setIcon("external-link")
        .onClick(() => this.actionDelegates.onOpenDailyNoteAction?.()),
    );
  }

  private addViewMenuItems(menu: Menu): void {
    const capabilities = getMFDIViewCapabilities(this.state);

    menu.addItem((item) =>
      item
        .setTitle("すべてのメッセージをコピー")
        .setIcon("copy")
        .onClick(() => this.actionDelegates.onCopyAllPosts?.()),
    );

    menu.addSeparator();

    menu.addItem((item) =>
      item.setTitle("ビュー").setIcon("panels-top-left").setDisabled(true),
    );

    menu.addItem((item) =>
      item
        .setTitle("下書きを管理")
        .setIcon("library")
        .onClick(() => this.actionDelegates.onOpenDraftList?.()),
    );

    if (capabilities.supportsDisplayModeSwitch) {
      const isFocus = this.state.displayMode === "focus";
      menu.addItem((item) =>
        item
          .setTitle(isFocus ? "フォーカスモード" : "タイムラインモード")
          .setIcon(isFocus ? "toggle-left" : "toggle-right")
          .onClick(() =>
            this.actionDelegates.onChangeDisplayMode?.(
              isFocus ? "timeline" : "focus",
            ),
          ),
      );
    }

    menu.addItem((item) =>
      item
        .setTitle(this.state.asTask ? "タスクモード" : "メッセージモード")
        .setIcon(this.state.asTask ? "toggle-left" : "toggle-right")
        .onClick(() =>
          this.actionDelegates.onChangeAsTask?.(!this.state.asTask),
        ),
    );
  }

  private addPeriodMenuItemsIfSupported(menu: Menu): void {
    const capabilities = getMFDIViewCapabilities(this.state);
    if (!capabilities.supportsPeriodMenus) return;
    if (this.state.displayMode !== "focus") return;

    addPeriodMenuItems(menu, this.state, {
      onChangeTimeFilter: (f) => this.actionDelegates.onChangeTimeFilter?.(f),
      onChangeDateFilter: (f) => this.actionDelegates.onChangeDateFilter?.(f),
    });
  }
}
