import { memo, useCallback, type FC } from "react";
import { InputAreaIcon } from "src/ui/components/inputarea/InputAreaIcon";
import { HStack } from "src/ui/components/primitives";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { useEditorStore } from "src/ui/store/editorStore";
import { getRawTagMetadata, isPinned } from "src/ui/utils/post-metadata";
import { PINNED_METADATA_KEY } from "src/ui/utils/post-metadata";
import { TAG_METADATA_KEY, serializeMfdiTags } from "src/core/tags";
import { useShallow } from "zustand/shallow";

type InputAreaMetadataActionsProps = {
  isReadOnly: boolean;
};

export const InputAreaMetadataActions: FC<InputAreaMetadataActionsProps> = memo(
  ({ isReadOnly }) => {
    const { showTextInput } = useObsidianUi();
    const { draftMetadata, setDraftMetadata } = useEditorStore(
      useShallow((s) => ({
        draftMetadata: s.draftMetadata,
        setDraftMetadata: s.setDraftMetadata,
      })),
    );

    const handleTogglePin = useCallback(() => {
      if (isReadOnly) return;

      const nextMetadata = { ...draftMetadata };
      if (isPinned(nextMetadata)) {
        // 意図: 解除時はキーを消して、submit 時に「ピン留めなし」を正しく保存する。
        delete nextMetadata[PINNED_METADATA_KEY];
      } else {
        nextMetadata[PINNED_METADATA_KEY] = "1";
      }
      setDraftMetadata(nextMetadata);
    }, [draftMetadata, isReadOnly, setDraftMetadata]);

    const handleEditTags = useCallback(async () => {
      if (isReadOnly) return;

      const nextValue = await showTextInput({
        title: "タグを入力",
        placeholder: "IT, Later",
        defaultValue: getRawTagMetadata(draftMetadata),
      });

      if (nextValue === null) return;

      const nextMetadata = { ...draftMetadata };
      const serializedTags = serializeMfdiTags(nextValue.split(","));
      if (serializedTags.length === 0) {
        // 意図: タグを空にした場合はキーごと消し、submit 時に残骸が残らないようにする。
        delete nextMetadata[TAG_METADATA_KEY];
      } else {
        nextMetadata[TAG_METADATA_KEY] = serializedTags;
      }
      setDraftMetadata(nextMetadata);
    }, [draftMetadata, isReadOnly, setDraftMetadata, showTextInput]);

    return (
      <HStack className="gap-[0.25em] items-center">
        <InputAreaIcon
          name="pin"
          ariaLabel={isPinned(draftMetadata) ? "ピン留め解除" : "ピン留め"}
          title={isPinned(draftMetadata) ? "ピン留め解除" : "ピン留め"}
          onActivate={handleTogglePin}
          isDisabled={isReadOnly}
        />
        <InputAreaIcon
          name="tag"
          ariaLabel="タグ編集"
          onActivate={handleEditTags}
          isDisabled={isReadOnly}
        />
      </HStack>
    );
  },
);
