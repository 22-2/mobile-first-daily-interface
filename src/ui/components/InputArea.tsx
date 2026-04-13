import type { ChangeEvent, FC } from "react";
import { memo, useCallback, useMemo, useState } from "react";
import { NavButton } from "src/ui/components/common/NavButton";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { ObsidianLiveEditor } from "src/ui/components/editor/ObsidianLiveEditor";
import { Box, Button, Flex, HStack, Input } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import {
  DISPLAY_MODE,
  PLACEHOLDER_TEXT,
  READONLY_PLACEHOLDER_TEXT,
} from "src/ui/config/consntants";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { useAppContext } from "src/ui/context/AppContext";
import { useObsidianComponent } from "src/ui/context/ComponentContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { useAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import {
  getCenterIndicatorLabel,
  isDefaultViewState,
} from "src/ui/utils/view-state";
import type { MFDIView } from "src/ui/view/MFDIView";
import { getMFDIViewCapabilities } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

const DisplayModeIndicator: FC<{
  displayMode: "focus" | "timeline";
  threadFocusRootId: string | null;
  activeTag: string | null;
  onClick: () => void;
}> = memo(({ displayMode, threadFocusRootId, activeTag, onClick }) => {
  const text = getCenterIndicatorLabel({
    displayMode,
    threadFocusRootId,
    activeTag,
  });
  return (
    <Box
      className="text-[length:var(--font-ui-small)] font-bold text-[var(--text-accent)] cursor-pointer"
      onClick={onClick}
    >
      {text}
    </Box>
  );
});

const InputAreaControl: FC<{
  isReadOnly: boolean;
  isExpanded: boolean;
  onExpandToMaxHeight: () => void;
}> = memo(({ isReadOnly, isExpanded, onExpandToMaxHeight }) => {
  const { viewNoteMode } = useAppStore(
    useShallow((s) => ({
      viewNoteMode: s.viewNoteMode,
    })),
  );
  const capabilities = useMemo(
    () => getMFDIViewCapabilities({ noteMode: viewNoteMode }),
    [viewNoteMode],
  );
  const {
    date,
    granularity,
    isToday,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
    handleClickHome,
    handleChangeCalendarDateAction,
    displayMode,
    activeTag,
    setDisplayMode,
    setActiveTag,
    setThreadFocusRootId,
    getMoveStep,
  } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      granularity: s.granularity,
      isToday: s.isToday(),
      handleClickMovePrevious: s.handleClickMovePrevious,
      handleClickMoveNext: s.handleClickMoveNext,
      handleClickToday: s.handleClickToday,
      handleClickHome: s.handleClickHome,
      handleChangeCalendarDateAction: s.handleChangeCalendarDate,
      displayMode: s.displayMode,
      activeTag: s.activeTag,
      setDisplayMode: s.setDisplayMode,
      setActiveTag: s.setActiveTag,
      setThreadFocusRootId: s.setThreadFocusRootId,
      getMoveStep: s.getMoveStep,
    })),
  );

  const { dateFilter, timeFilter, asTask, threadFocusRootId } =
    useSettingsStore(
      useShallow((s) => ({
        dateFilter: s.dateFilter,
        timeFilter: s.timeFilter,
        asTask: s.asTask,
        threadFocusRootId: s.threadFocusRootId,
      })),
    );

  const isViewDefault = isDefaultViewState({
    displayMode,
    granularity,
    dateFilter,
    timeFilter,
    asTask,
    activeTag,
    threadFocusRootId,
  });

  const isStatusIndicatorVisible =
    activeTag != null ||
    threadFocusRootId != null ||
    displayMode !== DISPLAY_MODE.FOCUS;

  const handleIndicatorClick = useCallback(() => {
    if (activeTag != null) {
      setActiveTag(null);
      return;
    }

    if (threadFocusRootId != null) {
      setThreadFocusRootId(null);
      return;
    }

    setDisplayMode(DISPLAY_MODE.FOCUS);
  }, [
    activeTag,
    setActiveTag,
    setDisplayMode,
    setThreadFocusRootId,
    threadFocusRootId,
  ]);

  const handleChangeCalendarDate = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleChangeCalendarDateAction(event.target.value);
    },
    [handleChangeCalendarDateAction],
  );

  // const step = getMoveStep();

  return (
    <Flex
      className={`mfdi-input-area-control items-center px-[1em] my-[var(--size-4-4)] h-[28px] group`}
    >
      {capabilities.supportsDateNavigation && (
        <ObsidianIcon
          name="home"
          size="1.1em"
          className={cn(
            isViewDefault
              ? "hover:bg-[var(--background-modifier-hover)]"
              : "text-[var(--text-accent)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]",
            // 意図: expand 中は上部バーを畳み、ホバー時だけ一時的に表示する。
            isExpanded && "hidden group-hover:flex",
          )}
          onClick={handleClickHome}
        />
      )}
      <Box className="flex-1" />
      <HStack
        className={cn(
          "mfdi-control-center justify-center flex-none",
          isExpanded && "hidden group-hover:flex",
        )}
      >
        {!capabilities.supportsDateNavigation ? null : isStatusIndicatorVisible ? (
          <DisplayModeIndicator
            displayMode={displayMode}
            threadFocusRootId={threadFocusRootId}
            activeTag={activeTag}
            onClick={handleIndicatorClick}
          />
        ) : (
          <>
            <NavButton direction="left" onClick={handleClickMovePrevious} />
            <HStack className="mfdi-date-controls gap-[0.2em]">
              <Input
                className={`mfdi-date-input h-[28px] text-[90%] pl-[var(--size-4-6)] ${GRANULARITY_CONFIG[granularity].inputWidthClass}`}
                type={GRANULARITY_CONFIG[granularity].inputType}
                value={date.format(GRANULARITY_CONFIG[granularity].inputFormat)}
                onChange={handleChangeCalendarDate}
              />
            </HStack>
            <NavButton direction="right" onClick={handleClickMoveNext} />
          </>
        )}
      </HStack>
      <Box className="flex-1 flex justify-end gap-[0.5em]">
        <ObsidianIcon
          name="maximize"
          size="1.1em"
          className={
            isReadOnly
              ? "cursor-default opacity-30"
              : "hover:bg-[var(--background-modifier-hover)]"
          }
          onClick={() => {
            if (isReadOnly) return;
            onExpandToMaxHeight();
          }}
        />
      </Box>
    </Flex>
  );
});

const InputAreaFooter: FC = memo(() => {
  const { posts } = useUnifiedPosts();

  const { asTask, isReadOnly } = useSettingsStore(
    useShallow((s) => ({
      asTask: s.asTask,
      isReadOnly: s.isReadOnly(),
    })),
  );

  const { canSubmit, cancelEdit } = useEditorStore(
    useShallow((s) => ({
      canSubmit: s.canSubmit(posts),
      cancelEdit: s.cancelEdit,
    })),
  );

  const { editingPost, inputSnapshot, clearInput } = useEditorStore(
    useShallow((s) => ({
      editingPost: s.editingPost,
      inputSnapshot: s.inputSnapshot,
      clearInput: s.clearInput,
    })),
  );

  const { addDraft } = useAppStore(
    useShallow((s) => ({
      addDraft: s.addDraft,
    })),
  );

  const handleCreateDraft = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!inputSnapshot.trim()) return;
      addDraft(inputSnapshot);
      clearInput();
    },
    [addDraft, inputSnapshot, clearInput],
  );

  const { handleSubmit } = usePostActions();

  return (
    <HStack className="justify-end items-center py-[0.5em] pb-[1em] mr-[1.2em]">
      {editingPost && (
        <Button className="h-[2.4em]" variant="ghost" onClick={cancelEdit}>
          キャンセル
        </Button>
      )}
      {/* {!isReadOnly && !editingPost && (
        <Button
          className="h-[2.4em]"
          variant="ghost"
          disabled={!inputSnapshot.trim()}
          onClick={handleCreateDraft}
        >
          下書きに追加
        </Button>
      )} */}
      <Button
        disabled={!canSubmit}
        className="h-[2.4em]"
        variant="accent"
        onClick={handleSubmit}
      >
        {isReadOnly
          ? "閲覧モード"
          : editingPost
            ? "更新"
            : asTask
              ? "タスク追加"
              : "投稿"}
      </Button>
    </HStack>
  );
});

export const InputArea: FC = memo(() => {
  const component = useObsidianComponent() as MFDIView;
  const [isExpanded, setIsExpanded] = useState(false);
  const { shell } = useAppContext();
  const { inputSnapshot, syncInputSession, inputRef } = useEditorStore(
    useShallow((s) => ({
      inputSnapshot: s.inputSnapshot,
      syncInputSession: s.syncInputSession,
      inputRef: s.inputRef,
    })),
  );
  const { isReadOnly } = useSettingsStore(
    useShallow((s) => ({
      isReadOnly: s.isReadOnly(),
    })),
  );
  const { handleSubmit } = usePostActions();

  const handleExpandToMaxHeight = useCallback(() => {
    // 意図: クラス付与のみで expand/collapse を切り替え、スタイル責務を CSS に寄せる。
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <Flex
      className={`mfdi-input-area ${isReadOnly ? "mod-read-only" : ""} ${isExpanded ? "mod-expanded" : ""} flex flex-col rounded-t-[22px] mr-[var(--size-4-3)] p-0 bg-[var(--background-secondary)] border border-[var(--table-border-color)]`}
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
