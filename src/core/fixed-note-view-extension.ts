import { WorkspaceLeaf } from "obsidian";
import {
  createFixedNoteViewState,
  DEFAULT_MFDI_VIEW_STATE,
  MFDIViewState,
} from "src/ui/view/state";
import {
  isMFDIFixedNotePath,
  normalizeFixedNotePath,
} from "src/utils/fixed-note";

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
  findExistingLeaf: (
    leaves: WorkspaceLeaf[],
    state: Partial<MFDIViewState>,
  ) => WorkspaceLeaf | undefined;
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

    findExistingLeaf: (leaves, state) => {
      const fixedPath = normalizeFixedNotePath(
        typeof state.fixedNotePath === "string" ? state.fixedNotePath : "",
      );
      const isFixedMode = state.noteMode === "fixed";

      return leaves.find((leaf) => {
        if (!isViewStatefulLeaf(leaf)) return false;

        const currentState = leaf.view.getState() as MFDIViewState;
        return isFixedMode
          ? currentState.noteMode === "fixed" &&
              normalizeFixedNotePath(currentState.fixedNotePath ?? "") ===
                fixedPath
          : currentState.noteMode !== "fixed";
      });
    },
  };
}
