import { Box, Button, Flex, HStack, Input } from "@chakra-ui/react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { ObsidianLiveEditor } from "src/ui/components/editor/ObsidianLiveEditor";
import {
  DISPLAY_MODE,
  PLACEHOLDER_TEXT,
  READONLY_PLACEHOLDER_TEXT,
} from "src/ui/config/consntants";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { useAppContext } from "src/ui/context/AppContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { DraftListModal } from "src/ui/modals/DraftListModal";
import { useAppStore, useCurrentAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import {
  getCenterIndicatorLabel,
  isDefaultViewState,
} from "src/ui/utils/view-state";
import { getMFDIViewCapabilities } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

const NavButton: React.FC<{
  direction: "left" | "right";
  onClick: () => void;
  step: number;
}> = ({ direction, onClick, step }) => {
  return (
    <HStack
      className={`mfdi-nav-button mfdi-nav-button-${direction}`}
      cursor="pointer"
      onClick={onClick}
      spacing={0}
      flexDirection={direction === "left" ? "row" : "row-reverse"}
    >
      <ObsidianIcon name={`chevron-${direction}`} boxSize="1.5em" />
      {step > 1 && (
        <Box fontSize="smaller" fontWeight="bold" color="var(--text-muted)">
          {step}
        </Box>
      )}
    </HStack>
  );
};

const DisplayModeIndicator: React.FC<{
  displayMode: "focus" | "timeline";
  threadFocusRootId: string | null;
  activeTag: string | null;
  onClick: () => void;
}> = React.memo(({ displayMode, threadFocusRootId, activeTag, onClick }) => {
  const text = getCenterIndicatorLabel({
    displayMode,
    threadFocusRootId,
    activeTag,
  });
  return (
    <Box
      fontSize="var(--font-ui-smaller)"
      fontWeight="bold"
      color="var(--text-accent)"
      cursor="pointer"
      onClick={onClick}
    >
      {text}
    </Box>
  );
});

const InputAreaControl: React.FC = React.memo(() => {
  const { view } = useAppContext();
  const viewState = view.getState();
  const capabilities = React.useMemo(
    () => getMFDIViewCapabilities(viewState),
    [view, viewState.noteMode],
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

  const handleIndicatorClick = React.useCallback(() => {
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

  const handleChangeCalendarDate = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleChangeCalendarDateAction(event.target.value);
    },
    [handleChangeCalendarDateAction],
  );

  const step = getMoveStep();

  return (
    <Flex
      align="center"
      paddingX="1em"
      marginY="var(--size-4-4)"
      className="mfdi-input-area-control"
      height="28px"
    >
      {capabilities.supportsDateNavigation && (
        <ObsidianIcon
          name="home"
          size="1.1em"
          color={isViewDefault ? undefined : "var(--text-accent)"}
          padding="4px"
          borderRadius="4px"
          _hover={
            isViewDefault
              ? { bg: "var(--background-modifier-hover)" }
              : {
                  color: "var(--text-normal)",
                  bg: "var(--background-modifier-hover)",
                }
          }
          onClick={handleClickHome}
        />
      )}
      <Box flex="1" />
      <HStack justify="center" flex="0 0 auto" className="mfdi-control-center">
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
            <HStack spacing="0.2em" className="mfdi-date-controls">
              <Input
                className="mfdi-date-input"
                size="sm"
                height="28px"
                fontSize="90%"
                type={GRANULARITY_CONFIG[granularity].inputType}
                value={date.format(GRANULARITY_CONFIG[granularity].inputFormat)}
                onChange={handleChangeCalendarDate}
                width={granularity === "year" ? "6.5em" : "10em"}
                paddingX="0.5em"
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
      <Box flex="1" display="flex" justifyContent="flex-end" gap="0.5em">
        <ObsidianIcon
          name="maximize"
          size="1.1em"
          cursor={isReadOnly ? "default" : "pointer"}
          opacity={isReadOnly ? 0.3 : 1}
          padding="4px"
          borderRadius="4px"
          _hover={
            isReadOnly
              ? {}
              : {
                  bg: "var(--background-modifier-hover)",
                }
          }
          onClick={() => {
            if (isReadOnly) return;
            view.handlers.onOpenModalEditor?.();
          }}
        />
      </Box>
    </Flex>
  );
});

const InputAreaFooter: React.FC = React.memo(() => {
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

  const { app } = useAppContext();
  const store = useCurrentAppStore();

  const handleOpenDrafts = React.useCallback(() => {
    new DraftListModal(app, store).open();
  }, [app, store]);

  const handleCreateDraft = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!inputSnapshot.trim()) return;
      addDraft(inputSnapshot);
      clearInput();
    },
    [addDraft, inputSnapshot, clearInput],
  );

  const { handleSubmit } = usePostActions();

  const submitButtonProps = canSubmit
    ? {
        bg: "var(--color-accent)!important;",
        color: "var(--text-on-accent)!important;",
        cursor: "pointer",
        _hover: { bg: "var(--color-accent-2)" },
      }
    : {
        bg: "var(--background-modifier-border)",
        color: "var(--text-muted)",
        cursor: "default",
        _hover: { bg: "var(--background-modifier-border)" },
      };

  return (
    <HStack
      justify="flex-end"
      alignItems="center"
      paddingY={"0.5em"}
      paddingBottom={"1em"}
      marginRight={"1.2em"}
    >
      {editingPost && (
        <Button
          minHeight={"2.4em"}
          maxHeight={"2.4em"}
          variant="ghost"
          onClick={cancelEdit}
        >
          キャンセル
        </Button>
      )}
      {!isReadOnly && !editingPost && (
        <Button
          minHeight={"2.4em"}
          maxHeight={"2.4em"}
          variant="ghost"
          disabled={!inputSnapshot.trim()}
          onClick={handleCreateDraft}
        >
          下書きに追加
        </Button>
      )}
      <Button
        disabled={!canSubmit}
        {...submitButtonProps}
        minHeight={"2.4em"}
        maxHeight={"2.4em"}
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

export const InputArea: React.FC = React.memo(() => {
  const { app, view } = useAppContext();
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
      flexDirection="column"
      className={`mfdi-input-area ${isReadOnly ? "mod-read-only" : ""}`}
      borderRadius="22px 22px 0 0"
      margin={0}
      marginRight="var(--size-4-3)"
      padding={0}
      backgroundColor="var(--background-secondary)"
      border="1px solid var(--table-border-color)"
    >
      <InputAreaControl />

      <ObsidianLiveEditor
        ref={inputRef}
        leaf={view.leaf}
        app={app}
        initialValue={inputSnapshot}
        onChange={syncInputSession}
        onSubmit={handleSubmit}
        minHeight="var(--size-4-18)"
        marginX="var(--size-4-4)"
        placeholder={PLACEHOLDER_TEXT}
        isReadOnly={isReadOnly}
        readonlyPlaceholder={READONLY_PLACEHOLDER_TEXT}
      />
      <InputAreaFooter />
    </Flex>
  );
});
