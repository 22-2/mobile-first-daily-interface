import type { ChangeEvent, FC } from "react";
import { memo, useCallback, useMemo } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { ObsidianLiveEditor } from "src/ui/components/editor/ObsidianLiveEditor";
import { Box, Button, Flex, HStack, Input } from "src/ui/components/primitives";
import {
  DISPLAY_MODE,
  PLACEHOLDER_TEXT,
  READONLY_PLACEHOLDER_TEXT,
} from "src/ui/config/consntants";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { useObsidianApp } from "src/ui/context/AppContext";
import { useObsidianComponent } from "src/ui/context/ComponentContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { useAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import {
  getCenterIndicatorLabel,
  isDefaultViewState,
} from "src/ui/utils/view-state";
import { getMFDIViewCapabilities } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

const NavButton: FC<{
  direction: "left" | "right";
  onClick: () => void;
  step: number;
}> = ({ direction, onClick, step }) => {
  return (
    <HStack
      className={`mfdi-nav-button mfdi-nav-button-${direction} cursor-pointer ${
        direction === "left" ? "flex-row" : "flex-row-reverse"
      } gap-0`}
      onClick={onClick}
    >
      <ObsidianIcon name={`chevron-${direction}`} boxSize="1.5em" />
      {step > 1 && (
        <Box className="text-sm font-bold text-[var(--text-muted)]">{step}</Box>
      )}
    </HStack>
  );
};

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

const InputAreaControl: FC = memo(() => {
  const component = useObsidianComponent();
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
    isReadOnly,
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
      isReadOnly: s.isReadOnly(),
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

  const step = getMoveStep();

  return (
    <Flex
      className={`mfdi-input-area-control items-center px-[1em] my-[var(--size-4-4)] h-[28px]`}
    >
      {capabilities.supportsDateNavigation && (
        <ObsidianIcon
          name="home"
          size="1.1em"
          className={
            isViewDefault
              ? "hover:bg-[var(--background-modifier-hover)]"
              : "text-[var(--text-accent)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]"
          }
          onClick={handleClickHome}
        />
      )}
      <Box className="flex-1" />
      <HStack className="mfdi-control-center justify-center flex-none">
        {!capabilities.supportsDateNavigation ? null : isStatusIndicatorVisible ? (
          <DisplayModeIndicator
            displayMode={displayMode}
            threadFocusRootId={threadFocusRootId}
            activeTag={activeTag}
            onClick={handleIndicatorClick}
          />
        ) : (
          <>
            <NavButton
              direction="left"
              onClick={handleClickMovePrevious}
              step={step}
            />
            <HStack className="mfdi-date-controls gap-[0.2em]">
              <Input
                className={`mfdi-date-input h-[28px] text-[90%] pl-[var(--size-4-6)] ${
                  granularity === "year" ? "w-[6.5em]" : "w-[10em]"
                }`}
                type={GRANULARITY_CONFIG[granularity].inputType}
                value={date.format(GRANULARITY_CONFIG[granularity].inputFormat)}
                onChange={handleChangeCalendarDate}
              />
            </HStack>
            <NavButton
              direction="right"
              onClick={handleClickMoveNext}
              step={step}
            />
          </>
        )}
      </HStack>
      <Box className="flex-1 flex justify-end gap-[0.5em]">
        <ObsidianIcon
          name="maximize"
          size="1.1em"
          className={
            isReadOnly || !("handlers" in component)
              ? "cursor-default opacity-30"
              : "hover:bg-[var(--background-modifier-hover)]"
          }
          onClick={() => {
            if (isReadOnly || !("handlers" in component)) return;
            (component as any).handlers.onOpenModalEditor?.();
          }}
        />
      </Box>
    </Flex>
  );
});

const InputAreaFooter: FC = memo(() => {
  const posts = usePostsStore((s) => s.posts);

  const { asTask, isReadOnly, setAsTask } = useSettingsStore(
    useShallow((s) => ({
      asTask: s.asTask,
      isReadOnly: s.isReadOnly(),
      setAsTask: s.setAsTask,
    })),
  );

  const { editingPostOffset, canSubmit, cancelEdit } = useEditorStore(
    useShallow((s) => ({
      editingPostOffset: s.editingPostOffset,
      canSubmit: s.canSubmit(posts),
      cancelEdit: s.cancelEdit,
    })),
  );

  const { editingPost, inputSnapshot, clearInput } = useEditorStore(
    useShallow((s) => ({
      editingPost: s.getEditingPost(posts),
      inputSnapshot: s.inputSnapshot,
      clearInput: s.clearInput,
    })),
  );

  const { addDraft } = useAppStore(
    useShallow((s) => ({
      addDraft: s.addDraft,
    })),
  );

  const { openDraftList } = useObsidianUi();

  const handleOpenDrafts = useCallback(() => {
    openDraftList();
  }, [openDraftList]);

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
  const component = useObsidianComponent();
  const app = useObsidianApp();
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

  return (
    <Flex
      className={`mfdi-input-area ${isReadOnly ? "mod-read-only" : ""} flex flex-col rounded-t-[22px] mr-[var(--size-4-3)] p-0 bg-[var(--background-secondary)] border border-[var(--table-border-color)]`}
    >
      <InputAreaControl />

      <ObsidianLiveEditor
        ref={inputRef}
        leaf={"leaf" in component ? (component as any).leaf : undefined}
        app={app}
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
