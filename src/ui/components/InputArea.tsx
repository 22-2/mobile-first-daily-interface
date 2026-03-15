import { Box, Button, Flex, HStack, Input } from "@chakra-ui/react";
import { Menu } from "obsidian";
import * as React from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { ObsidianLiveEditor } from "src/ui/components/common/ObsidianLiveEditor";
import {
  DISPLAY_MODE,
  PLACEHOLDER_TEXT,
  READONLY_PLACEHOLDER_TEXT,
} from "src/ui/config/consntants";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { useAppContext } from "src/ui/context/AppContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { addGranularityMenuItems } from "src/ui/menus/granularityMenu";
import { addPostModeMenuItems } from "src/ui/menus/postModeMenu";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

import { postsStore } from "src/ui/store/postsStore";

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

const InputAreaControl: React.FC = React.memo(() => {
  const { view } = useAppContext();
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
    setDisplayMode,
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
      setDisplayMode: s.setDisplayMode,
      getMoveStep: s.getMoveStep,
    })),
  );

  const handleChangeCalendarDate = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleChangeCalendarDateAction(event.target.value);
    },
    [handleChangeCalendarDateAction],
  );

  const step = getMoveStep();

  const todayButtonProps = isToday
    ? {
        bg: "var(--background-modifier-border)",
        color: "var(--text-normal)",
        _hover: { bg: "var(--background-modifier-border)" },
      }
    : {
        bg: "var(--color-accent)!important;",
        color: "var(--text-on-accent)!important;",
        _hover: { bg: "var(--color-accent-2)" },
      };

  return (
    <Flex
      align="center"
      paddingX="1em"
      marginY="var(--size-4-4)"
      className="mfdi-input-area-control"
    >
      <ObsidianIcon
        name="home"
        size="1.1em"
        cursor="pointer"
        color="var(--text-muted)"
        padding="4px"
        borderRadius="4px"
        _hover={{
          color: "var(--text-normal)",
          bg: "var(--background-modifier-hover)",
        }}
        onClick={handleClickHome}
      />
      <Box flex="1" />
      <HStack justify="center" flex="0 0 auto" className="mfdi-control-center">
        {displayMode === DISPLAY_MODE.FOCUS ? (
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
        ) : (
          <Box
            fontSize="var(--font-ui-smaller)"
            fontWeight="bold"
            color="var(--text-accent)"
            cursor="pointer"
            onClick={() => setDisplayMode(DISPLAY_MODE.FOCUS)}
          >
            タイムライン表示中
          </Box>
        )}
      </HStack>
      <Box flex="1" display="flex" justifyContent="flex-end" gap="0.5em">
        <ObsidianIcon
          name="maximize"
          size="1.1em"
          cursor={isReadOnly ? "default" : "pointer"}
          color="var(--text-muted)"
          opacity={isReadOnly ? 0.3 : 1}
          padding="4px"
          borderRadius="4px"
          _hover={
            isReadOnly
              ? {}
              : {
                  color: "var(--text-normal)",
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
      canSubmit: s.canSubmit(postsStore.getState().posts),
      cancelEdit: s.cancelEdit,
    })),
  );

  const editingPost = useEditorStore((s) =>
    s.getEditingPost(postsStore.getState().posts),
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
      <Button
        disabled={!canSubmit}
        {...submitButtonProps}
        minHeight={"2.4em"}
        maxHeight={"2.4em"}
        onClick={handleSubmit}
        onContextMenu={(e) => {
          if (!setAsTask) return;
          e.preventDefault();
          const menu = new Menu();
          addPostModeMenuItems(menu, asTask, setAsTask);
          menu.showAtMouseEvent(e.nativeEvent);
        }}
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
  const { input, setInput, inputRef } = useEditorStore(
    useShallow((s) => ({
      input: s.input,
      setInput: s.setInput,
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
        value={input}
        onChange={setInput}
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
