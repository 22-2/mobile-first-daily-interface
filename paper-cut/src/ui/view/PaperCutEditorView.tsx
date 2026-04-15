import { ItemView, Scope } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { DEFAULT_SETTINGS } from "src/settings";
import { EditorOnlyReactView } from "src/ui/components/layout/EditorOnlyReactView";
import type { MFDIEditorViewState } from "src/ui/view/MFDIEditorView";
import "src/ui/styles/global.css";

export const VIEW_TYPE_PAPER_CUT_EDITOR = "paper-cut-editor-view";

// MFDIEditorViewState と同一の形式を使い回す
export type PaperCutEditorViewState = MFDIEditorViewState;

// Paper Cut のポップアウトエディタ ItemView。
// EditorOnlyReactView（MFDI 資産）をそのまま再利用する。
// settings は Paper Cut 固有のものを持たないため、MFDI の DEFAULT_SETTINGS を利用する。
export class PaperCutEditorView extends ItemView {
  private root: Root | null = null;
  private state: PaperCutEditorViewState | null = null;
  // popout ウィンドウでは navigation ヘッダが不要
  public navigation: boolean = false;

  getIcon(): string {
    return "pencil";
  }

  getViewType(): string {
    return VIEW_TYPE_PAPER_CUT_EDITOR;
  }

  getDisplayText(): string {
    return "Paper Cut エディタ";
  }

  async onOpen(): Promise<void> {
    // scope は MagicalEditor が親スコープとして参照するため先に設定する
    this.scope = new Scope(this.app.scope);
    window.setTimeout(() => this.setupView());
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }

  async setState(state: PaperCutEditorViewState): Promise<void> {
    this.state = state;
    this.setupView();
  }

  getState(): PaperCutEditorViewState {
    return this.state ?? ({} as PaperCutEditorViewState);
  }

  private setupView(): void {
    if (!this.root) {
      this.root = createRoot(this.containerEl.children[1]);
    }
    this.root.render(
      <EditorOnlyReactView
        app={this.app}
        // Paper Cut はポスト保存に MFDI の PopoutInputArea を再利用するため、
        // MFDI のデフォルト設定を渡す。固定ノートのため updateDateStrategy は "never" が適切。
        settings={DEFAULT_SETTINGS}
        view={this}
        initialState={this.state}
      />,
    );
  }
}
