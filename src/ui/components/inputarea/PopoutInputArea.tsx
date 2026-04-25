import type { FC } from "react";
import { memo, useCallback, useEffect } from "react";
import { ObsidianLiveEditor } from "src/ui/components/editor/ObsidianLiveEditor";
import { InputAreaFooterBase } from "src/ui/components/inputarea/InputAreaFooterBase";
import { InputAreaMetadataActions } from "src/ui/components/inputarea/InputAreaMetadataActions";
import { Flex } from "src/ui/components/primitives";
import { PLACEHOLDER_TEXT, STORAGE_KEYS } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { useObsidianComponent } from "src/ui/context/ComponentContext";
import { useEditorRefs } from "src/ui/context/EditorRefsContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { DiscardConfirmModal } from "src/ui/modals/DiscardConfirmModal";
import { useEditorStore } from "src/ui/store/editorStore";
import type { MFDIEditorView } from "src/ui/view/MFDIEditorView";
import { useShallow } from "zustand/shallow";

/**
 * ポップアウトウィンドウ専用の入力エリア。
 * InputAreaControl（縮小・拡大・ナビゲーション）を持たず、エディタを全画面表示する。
 * 変更がある場合のキャンセルは DiscardConfirmModal で確認してから破棄する。
 * 投稿/更新後はウィンドウを閉じる。
 */
export const PopoutInputArea: FC = memo(() => {
  // 意図: leaf.detach() でウィンドウを閉じるため、ItemView としてキャストして leaf を参照する。
  const view = useObsidianComponent() as unknown as MFDIEditorView;
  const { shell, storage } = useAppContext();
  const { inputRef } = useEditorRefs();

  const { inputSnapshot, inputSnapshotVersion, syncInputSession, editingPost } =
    useEditorStore(
      useShallow((s) => ({
        inputSnapshot: s.inputSnapshot,
        inputSnapshotVersion: s.inputSnapshotVersion,
        syncInputSession: s.syncInputSession,
        editingPost: s.editingPost,
      })),
    );

  const { clearInput } = useEditorStore(
    useShallow((s) => ({ clearInput: s.clearInput })),
  );

  const { posts } = useUnifiedPosts();
  const canSubmit = useEditorStore((s) => s.canSubmit(posts));

  const { handleSubmit } = usePostActions();

  const closeView = useCallback(() => {
    view.leaf.detach();
  }, [view]);

  const handleCancel = useCallback(async () => {
    const originalMessage = editingPost?.message ?? "";
    const hasChanged = inputSnapshot.trim() !== originalMessage.trim();

    // 意図: 変更がない場合は確認なしで閉じる。
    if (!hasChanged) {
      clearInput();
      closeView();
      return;
    }

    // 意図: 「二度と表示しない」が保存済みの場合は確認をスキップして破棄する。
    const skipConfirm = storage.get<boolean>(
      STORAGE_KEYS.SKIP_POPOUT_DISCARD_CONFIRM,
      false,
    );
    if (skipConfirm) {
      clearInput();
      closeView();
      return;
    }

    const result = await new DiscardConfirmModal(
      shell.getRawApp(),
    ).show();

    if (!result.confirmed) return;

    // 意図: 「二度と表示しない」が選ばれた場合は今後スキップするよう保存する。
    if (result.neverShowAgain) {
      storage.set(STORAGE_KEYS.SKIP_POPOUT_DISCARD_CONFIRM, true);
    }

    clearInput();
    closeView();
  }, [editingPost, inputSnapshot, storage, shell, clearInput, closeView]);

  const handleSubmitAndClose = useCallback(async () => {
    await handleSubmit();
    // 意図: submit は成功時に clearInput するため、その後に閉じる。
    closeView();
  }, [handleSubmit, closeView]);

  // 意図: popout が開いた直後にエディタへフォーカスを移し、すぐに入力できるようにする。
  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus());
  }, [inputRef]);

  return (
    <Flex className="mfdi-popout-editor h-full w-full flex-col overflow-hidden bg-[var(--background-primary)]">
      <ObsidianLiveEditor
        ref={inputRef}
        leaf={view.leaf}
        app={shell.getRawApp()}
        initialValue={inputSnapshot}
        externalVersion={inputSnapshotVersion}
        onChange={syncInputSession}
        onSubmit={handleSubmitAndClose}
        className="mfdi-popout-editor__editor flex-1 min-h-0 mx-[var(--size-4-4)]"
        placeholder={PLACEHOLDER_TEXT}
        isReadOnly={false}
      />
      <InputAreaFooterBase
        canSubmit={canSubmit}
        submitLabel={editingPost ? "更新" : "投稿"}
        onSubmit={handleSubmitAndClose}
        onCancel={handleCancel}
        characterCount={inputSnapshot.length}
        leadingActions={<InputAreaMetadataActions isReadOnly={false} />}
      />
    </Flex>
  );
});
