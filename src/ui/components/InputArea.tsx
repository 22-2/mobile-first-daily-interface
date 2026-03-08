import { Box, Button, Flex, HStack, Input } from "@chakra-ui/react";
import { Menu } from "obsidian";
import * as React from "react";
import { replaceDayToJa } from "../../utils/strings";
import { DATE_FILTER_OPTIONS } from "../config/filter-config";
import { granularityConfig } from "../config/granularity-config";
import { useAppContext } from "../context/AppContext";
import { useMFDIContext } from "../context/MFDIAppContext";
import { addGranularityMenuItems } from "../menus/granularityMenu";
import { addPostModeMenuItems } from "../menus/postModeMenu";
import { ObsidianIcon } from "./common/ObsidianIcon";
import { ObsidianLiveEditor } from "./common/ObsidianLiveEditor";

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
      paddingX="0.5em"
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
    dateFilter,
    isToday,
    sidebarOpen,
    setSidebarOpen,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
    handleChangeCalendarDate,
    getMoveStep,
  } = useMFDIContext();

  const step = getMoveStep();

  return (
    <Flex align="center" paddingX="1em" marginY="var(--size-4-4)" className="mfdi-input-area-control">
      <Box flex="1" />
      <HStack justify="center" flex="0 0 auto" className="mfdi-control-center">
        <NavButton
          direction="left"
          onClick={handleClickMovePrevious}
          step={step}
        />
        <HStack spacing="0.2em" className="mfdi-date-controls">
          <Button
            className="mfdi-today-button"
            fontSize={"80%"}
            width="3.5em"
            height="2.2em"
            cursor="pointer"
            onClick={handleClickToday}
            onContextMenu={(e) => {
              const menu = new Menu();
              addGranularityMenuItems(menu, view.state.granularity, (g) => {
                view.handlers.onChangeGranularity?.(g);
              });
              menu.showAtMouseEvent(e.nativeEvent);
            }}
            bg={
              !isToday
                ? "var(--color-accent)!important;"
                : "var(--background-modifier-border)"
            }
            color={!isToday ? "var(--text-on-accent)" : "var(--text-muted)"}
            _hover={{
              bg: !isToday
                ? "var(--color-accent-2)"
                : "var(--background-modifier-border)",
            }}
          >
            {granularityConfig[granularity].todayLabel}
          </Button>
          <Input
            className="mfdi-date-input"
            size="sm"
            height="2.2em"
            fontSize="90%"
            type={granularityConfig[granularity].inputType}
            value={date.format(granularityConfig[granularity].inputFormat)}
            onChange={handleChangeCalendarDate}
            width={granularity === "year" ? "6.5em" : "10em"}
            paddingX="0.5em"
          />
          {granularityConfig[granularity].showWeekday && (
            <Box fontSize={"smaller"} fontWeight="bold" whiteSpace="nowrap" className="mfdi-weekday-label">
              {replaceDayToJa(date.format("(ddd)"))}
            </Box>
          )}
        </HStack>
        <NavButton
          direction="right"
          onClick={handleClickMoveNext}
          step={step}
        />
      </HStack>
      <Box flex="1" display="flex" justifyContent="flex-end">
        <ObsidianIcon
          name="maximize"
          size="1.1em"
          cursor="pointer"
          color="var(--text-muted)"
          padding="4px"
          borderRadius="4px"
          _hover={{
            color: "var(--text-normal)",
            bg: "var(--background-modifier-hover)",
          }}
          onClick={() => {
            view.handlers.onOpenModalEditor?.();
          }}
        />
      </Box>
    </Flex>
  );
});

const InputAreaFooter: React.FC = React.memo(() => {
  const {
    asTask,
    editingPost,
    canSubmit,
    isReadOnly,
    handleSubmit,
    cancelEdit,
    setAsTask,
  } = useMFDIContext();

  return (
    <HStack
      justify="flex-end"
      alignItems="center"
      paddingY={"0.5em"}
      paddingBottom={"1em"}
      marginRight={"2.4em"}
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
        bg={
          canSubmit
            ? "var(--color-accent)!important;"
            : "var(--background-modifier-border)"
        }
        color={canSubmit ? "var(--text-on-accent)" : "var(--text-muted)"}
        _hover={{
          bg: canSubmit
            ? "var(--color-accent-2)"
            : "var(--background-modifier-border)",
        }}
        minHeight={"2.4em"}
        maxHeight={"2.4em"}
        cursor={canSubmit ? "pointer" : ""}
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
  const { input, setInput, handleSubmit, isReadOnly, inputRef } =
    useMFDIContext();

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
        placeholder={isReadOnly ? "閲覧モード（書き込み不可）" : undefined}
      />

      <InputAreaFooter />
    </Flex>
  );
});
