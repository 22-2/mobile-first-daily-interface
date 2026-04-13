import type { FC } from "react";
import { memo, useCallback, useState } from "react";
import { ObsidianLiveEditor } from "src/ui/components/editor/ObsidianLiveEditor";
import { Flex } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import {
  PLACEHOLDER_TEXT,
  READONLY_PLACEHOLDER_TEXT,
} from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { useObsidianComponent } from "src/ui/context/ComponentContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { MFDIView } from "src/ui/view/MFDIView";
import { useShallow } from "zustand/shallow";
import { InputAreaFooter } from "src/ui/components/inputarea/InputAreaFooter";
import { InputAreaControl } from "src/ui/components/inputarea/InputAreaControl";

export const InputArea: FC = memo(() => {
  const component = useObsidianComponent() as MFDIView;
  const { shell } = useAppContext();
  const { inputSnapshot, syncInputSession, inputRef } = useEditorStore(
    useShallow((s) => ({
      inputSnapshot: s.inputSnapshot,
      syncInputSession: s.syncInputSession,
      inputRef: s.inputRef,
    })),
  );
  const { isReadOnly, isExpanded, setIsExpanded } = useSettingsStore(
    useShallow((s) => ({
      isReadOnly: s.isReadOnly(),
      isExpanded: s.expanded,
      setIsExpanded: s.setIsExpanded,
    })),
  );
  const { handleSubmit } = usePostActions();

  const handleExpandToMaxHeight = useCallback(() => {
    // 意図: クラス付与のみで expand/collapse を切り替え、スタイル責務を CSS に寄せる。
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <Flex
      className={cn(
        `mfdi-input-area ${isReadOnly ? "mod-read-only" : ""} ${isExpanded ? "mod-expanded" : ""} flex flex-col rounded-t-[22px] p-0 bg-[var(--background-secondary)] border border-[var(--table-border-color)]`,
      )}
    >
      <InputAreaControl
        isReadOnly={isReadOnly}
        isExpanded={isExpanded}
        onExpandToMaxHeight={handleExpandToMaxHeight}
      />

      <ObsidianLiveEditor
        ref={inputRef}
        leaf={component.leaf}
        app={shell.getRawApp()}
        initialValue={inputSnapshot}
        onChange={syncInputSession}
        onSubmit={handleSubmit}
        className="min-h-[var(--size-4-18)] mx-[var(--size-4-4)]"
        placeholder={PLACEHOLDER_TEXT}
        isReadOnly={isReadOnly}
        readonlyPlaceholder={READONLY_PLACEHOLDER_TEXT}
      />
      <InputAreaFooter />
    </Flex>
  );
});
