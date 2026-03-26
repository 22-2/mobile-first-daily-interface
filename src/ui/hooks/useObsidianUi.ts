import { useCallback, useMemo } from "react";
import { useObsidianApp } from "src/ui/context/AppContext";
import {
  DeleteConfirmModal,
  showDeleteConfirmModal,
} from "src/ui/modals/DeleteConfirmModal";
import { DraftListModal } from "src/ui/modals/DraftListModal";
import { showInputModal } from "src/ui/modals/InputModal";
import type {
  MFDIEditorModalOptions} from "src/ui/modals/MFDIEditorModal";
import {
  MFDIEditorModal
} from "src/ui/modals/MFDIEditorModal";
import { useCurrentAppStore } from "src/ui/store/appStore";

type DeleteConfirmArgs = Parameters<typeof showDeleteConfirmModal>[1];
type InputModalArgs = Parameters<typeof showInputModal>[1];

export function useObsidianUi() {
  const app = useObsidianApp();
  const store = useCurrentAppStore();

  const openDraftList = useCallback(() => {
    new DraftListModal(app, store).open();
  }, [app, store]);

  const showTextInput = useCallback(
    (args: InputModalArgs) => showInputModal(app, args),
    [app],
  );

  const confirmDelete = useCallback(
    (args: DeleteConfirmArgs) => showDeleteConfirmModal(app, args),
    [app],
  );

  const confirmDeleteAction = useCallback(
    (onConfirm: () => Promise<void>) => {
      new DeleteConfirmModal(app, onConfirm).open();
    },
    [app],
  );

  const openModalEditor = useCallback(
    (options: MFDIEditorModalOptions) => {
      // Obsidian UI API が raw app を要求する処理はここへ集約して、通常コンポーネントへ漏らさない。
      const modal = new MFDIEditorModal(app, options);
      modal.open();
      return modal;
    },
    [app],
  );

  return useMemo(
    () => ({
      openDraftList,
      showTextInput,
      confirmDelete,
      confirmDeleteAction,
      openModalEditor,
    }),
    [
      openDraftList,
      showTextInput,
      confirmDelete,
      confirmDeleteAction,
      openModalEditor,
    ],
  );
}
