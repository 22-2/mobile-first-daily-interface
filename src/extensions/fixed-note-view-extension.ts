import type { WorkspaceLeaf } from "obsidian";
import type { MFDIViewState } from "src/ui/view/state";
import {
  createFixedNoteViewState,
  DEFAULT_MFDI_VIEW_STATE,
} from "src/ui/view/state";
import {
  isMFDIFixedNotePath,
  normalizeFixedNotePath,
} from "src/core/fixed-note";

type LeafWithState = WorkspaceLeaf & {
  view: { getState: () => MFDIViewState; file?: { path?: string } };
};

const MFDI_VIEW_TYPE = "mfdi-view";

function isViewStatefulLeaf(leaf: WorkspaceLeaf): leaf is LeafWithState {
  const view = (leaf as LeafWithState).view;
  return !!view && typeof view.getState === "function";
}

export interface FixedNoteViewExtension {
  convertMarkdownViewState: (viewState: unknown) => unknown;
  replaceOpenFixedMarkdownLeaves: (params: {
    leaves: WorkspaceLeaf[];
    attachMFDIView: (
      state: Partial<MFDIViewState>,
      preferredLeaf?: WorkspaceLeaf,
    ) => Promise<WorkspaceLeaf | undefined>;
  }) => Promise<void>;
}

// contribution の外側（main 等）が leaf 探索だけしたい場合に直接インポートできるよう standalone export にする。
// extension インターフェースに載せると「contribution に渡すオブジェクト」と「main が直接呼ぶ関数」の二重管理になるため分離した。
export function findExistingMFDILeaf(
  leaves: WorkspaceLeaf[],
  state: Partial<MFDIViewState>,
): WorkspaceLeaf | undefined {
  const isFixedMode = state.noteMode === "fixed";
  const fixedPath = normalizeFixedNotePath(
    typeof state.fixedNotePath === "string" ? state.fixedNotePath : "",
  );

  return leaves.find((leaf) => {
    if (!isViewStatefulLeaf(leaf)) return false;
    const currentState = leaf.view.getState() as MFDIViewState;
    return isFixedMode
      ? currentState.noteMode === "fixed" &&
          normalizeFixedNotePath(currentState.fixedNotePath ?? "") === fixedPath
      : currentState.noteMode !== "fixed";
  });
}

export function createFixedNoteViewExtension(): FixedNoteViewExtension {
  return {
    convertMarkdownViewState: (viewState) => {
      if (!viewState || typeof viewState !== "object") return viewState;
      const candidate = viewState as {
        type?: string;
        state?: Record<string, unknown>;
      };
      if (candidate.type !== "markdown") return viewState;

      // フラグが付与されている場合は強制的にMarkdownビューとして開く意図がある。
      if (candidate.state?.__mfdi_force_markdown) return viewState;

      const filePath =
        typeof candidate.state?.file === "string" ? candidate.state.file : "";
      if (!isMFDIFixedNotePath(filePath)) return viewState;

      // TODO: ここでファイルの存在チェックを入れたい
      // app.vault.adapter.exists(filePath) で存在チェックできるはずだが、app をこの関数に渡す必要があるため、実装が少し面倒。

      return {
        ...candidate,
        type: MFDI_VIEW_TYPE,
        state: {
          ...DEFAULT_MFDI_VIEW_STATE,
          ...createFixedNoteViewState(filePath),
        },
      };
    },

    replaceOpenFixedMarkdownLeaves: async ({ leaves, attachMFDIView }) => {
      for (const leaf of leaves) {
        const filePath = isViewStatefulLeaf(leaf)
          ? (leaf.view.file?.path ?? "")
          : "";
        if (!isMFDIFixedNotePath(filePath)) continue;
        await attachMFDIView(createFixedNoteViewState(filePath), leaf);
      }
    },
  };
}
