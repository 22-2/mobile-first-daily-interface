import { type WorkspaceLeaf, Plugin } from "obsidian";
import type { PaperCutSettings } from "paper-cut/src/settings";
import { DEFAULT_PAPER_CUT_SETTINGS } from "paper-cut/src/settings";
import {
  EditorView,
  VIEW_TYPE_PAPER_CUT_EDITOR,
} from "paper-cut/src/ui/view/EditorView";
import {
  PaperCutView,
  VIEW_TYPE_PAPER_CUT,
} from "paper-cut/src/ui/view/PaperCutView";
import { ensureFixedNote } from "src/core/fixed-note";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { showInputModal } from "src/ui/modals/InputModal";

export default class PaperCutPlugin extends Plugin {
  settings: PaperCutSettings = { ...DEFAULT_PAPER_CUT_SETTINGS };
  private shell!: ObsidianAppShell;

  async onload() {
    await this.loadSettings();

    this.app.workspace.onLayoutReady(() => {
      this.shell = new ObsidianAppShell(this.app);

      // ビューを登録する
      this.registerView(
        VIEW_TYPE_PAPER_CUT,
        (leaf) => new PaperCutView(leaf),
      );
      this.registerView(
        VIEW_TYPE_PAPER_CUT_EDITOR,
        (leaf) => new EditorView(leaf),
      );

      // リボンアイコン
      this.addRibbonIcon("scissors", "Paper Cut を開く", () => {
        void this.openOrCreateNote();
      });

      // コマンド: 新規ノートを作成して開く
      this.addCommand({
        id: "open-paper-cut",
        name: "Paper Cut を開く",
        callback: () => void this.openOrCreateNote(),
      });

      // コマンド: ファイルパスを指定して開く
      this.addCommand({
        id: "open-paper-cut-with-path",
        name: "Paper Cut を特定のノートで開く",
        callback: () => void this.openWithInputPath(),
      });
    });
  }

  onunload() {}

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_PAPER_CUT_SETTINGS,
      await this.loadData(),
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // ---------------------------------------------------------------------------
  // Private: View management
  // ---------------------------------------------------------------------------

  private async openOrCreateNote() {
    const path = this.settings.fixedNotePath;
    if (path) {
      await this.openView(path);
    } else {
      await this.openWithInputPath();
    }
  }

  // ユーザーにファイルパスを入力させてノートを開く
  private async openWithInputPath() {
    const inputPath = await showInputModal(this.app, {
      title: "Paper Cut: ノートを指定",
      placeholder: "例: paper-cut/my-draft.md",
      defaultValue: this.settings.fixedNotePath ?? "",
    });
    if (!inputPath) return;

    // ノートが存在しなければ作成する
    const file = await ensureFixedNote(this.shell, inputPath);
    this.settings.fixedNotePath = file.path;
    await this.saveSettings();

    await this.openView(file.path);
  }

  private async openView(filePath: string) {
    // 同じファイルを開いているビューがあれば再利用する
    const existing = this.findExistingLeaf(filePath);
    if (existing) {
      this.app.workspace.revealLeaf(existing);
      return;
    }

    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({
      type: VIEW_TYPE_PAPER_CUT,
      state: { filePath } satisfies { filePath: string },
    });
    this.app.workspace.revealLeaf(leaf);
  }

  private findExistingLeaf(filePath: string): WorkspaceLeaf | null {
    let found: WorkspaceLeaf | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (
        leaf.view.getViewType() === VIEW_TYPE_PAPER_CUT &&
        (leaf.view as PaperCutView).getState().filePath === filePath
      ) {
        found = leaf;
      }
    });
    return found;
  }
}
