import { useCallback, useMemo } from "react";
import { useAppContext } from "src/ui/context/AppContext";
import {
  DeleteConfirmModal,
  showDeleteConfirmModal,
} from "src/ui/modals/DeleteConfirmModal";
import { DraftListModal } from "src/ui/modals/DraftListModal";
import { showInputModal } from "src/ui/modals/InputModal";
import {
  openBacklinkPreviewModal,
  type BacklinkPreviewModalOptions,
} from "src/ui/modals/BacklinkPreviewModal";
import type { MFDIEditorModalOptions } from "src/ui/modals/MFDIEditorModal";
import { MFDIEditorModal } from "src/ui/modals/MFDIEditorModal";
import { useCurrentAppStore } from "src/ui/store/appStore";

type DeleteConfirmArgs = Parameters<typeof showDeleteConfirmModal>[1];
type InputModalArgs = Parameters<typeof showInputModal>[1];

export function useObsidianUi() {
  const { shell } = useAppContext();
  const store = useCurrentAppStore();

  const openDraftList = useCallback(() => {
    new DraftListModal(shell.getRawApp(), store).open();
  }, [shell, store]);

  const showTextInput = useCallback(
    (args: InputModalArgs) => showInputModal(shell.getRawApp(), args),
    [shell],
  );

  const confirmDelete = useCallback(
    (args: DeleteConfirmArgs) =>
      showDeleteConfirmModal(shell.getRawApp(), args),
    [shell],
  );

  const confirmDeleteAction = useCallback(
    (onConfirm: () => Promise<void>) => {
      new DeleteConfirmModal(shell.getRawApp(), onConfirm).open();
    },
    [shell],
  );

  const openModalEditor = useCallback(
    (options: MFDIEditorModalOptions) => {
      // Obsidian UI API が raw app を要求する処理はここへ集約して、通常コンポーネントへ漏らさない。
      const modal = new MFDIEditorModal(shell.getRawApp(), options);
      modal.open();
      return modal;
    },
    [shell],
  );

  const openBacklinkPreview = useCallback(
    (options: BacklinkPreviewModalOptions) => {
      // Obsidian の Modal 生成は raw app 依存なので、呼び出し側には options だけを渡させる。
      return openBacklinkPreviewModal(shell.getRawApp(), options);
    },
    [shell],
  );

  return useMemo(
    () => ({
      openDraftList,
      showTextInput,
      confirmDelete,
      confirmDeleteAction,
      openModalEditor,
      openBacklinkPreview,
    }),
    [
      openDraftList,
      showTextInput,
      confirmDelete,
      confirmDeleteAction,
      openModalEditor,
      openBacklinkPreview,
    ],
  );
}
