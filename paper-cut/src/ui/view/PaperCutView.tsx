import type { WorkspaceLeaf } from "obsidian";
import { ItemView } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { PaperCutReactView } from "paper-cut/src/ui/components/layout/PaperCutReactView";
// paper-cut 専用 CSS — @source で paper-cut/src/ と MFDI src/ を両方スキャンする
import "paper-cut/src/ui/styles/global.css";

export const VIEW_TYPE_PAPER_CUT = "paper-cut-view";

export interface PaperCutViewState extends Record<string, unknown> {
  filePath: string | null;
}

const DEFAULT_PAPER_CUT_VIEW_STATE: PaperCutViewState = {
  filePath: null,
};

export class PaperCutView extends ItemView {
  private root: Root | null = null;
  private shell: ObsidianAppShell;
  private state: PaperCutViewState = { ...DEFAULT_PAPER_CUT_VIEW_STATE };
  // ナビゲーションヘッダは不要
  public navigation: boolean = false;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.shell = new ObsidianAppShell(this.app);
  }

  getIcon(): string {
    return "scissors";
  }

  getViewType(): string {
    return VIEW_TYPE_PAPER_CUT;
  }

  getDisplayText(): string {
    if (this.state.filePath) {
      // パスの末尾からファイル名部分を表示する（拡張子を除く）
      const name = this.state.filePath
        .split("/")
        .pop()
        ?.replace(/\.md$/, "") ?? "Paper Cut";
      return `Paper Cut: ${name}`;
    }
    return "Paper Cut";
  }

  async onOpen(): Promise<void> {
    this.shell = new ObsidianAppShell(this.app);

    // サイドバートグルアクション
    this.addAction("columns-2", "サイドバーを切り替え", () => {
      // PaperCutStoreへのアクセスは React 側で行うため、
      // カスタムイベントを dispatch してサイドバーの開閉を通知する
      this.containerEl.dispatchEvent(
        new CustomEvent("paper-cut:toggle-sidebar"),
      );
    });

    window.setTimeout(() => this.setupView());
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }

  async setState(state: PaperCutViewState): Promise<void> {
    this.state = { ...this.state, ...state };
    this.setupView();
  }

  getState(): PaperCutViewState {
    return this.state;
  }

  private setupView(): void {
    if (!this.root) {
      this.root = createRoot(this.containerEl.children[1]);
    }
    this.root.render(
      <PaperCutReactView
        app={this.app}
        shell={this.shell}
        filePath={this.state.filePath}
        containerEl={this.containerEl}
        view={this}
      />,
    );
  }
}
