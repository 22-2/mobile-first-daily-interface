import { Box, Button, Flex, HStack, Input } from "@chakra-ui/react";
import { Menu } from "obsidian";
import * as React from "react";
import { replaceDayToJa } from "../../utils/strings";
import { granularityConfig } from "../config/granularity-config";
import { useAppContext } from "../context/AppContext";
import { useMFDIContext } from "../context/MFDIAppContext";
import { addGranularityMenuItems } from "../menus/granularityMenu";
import { ObsidianIcon } from "./common/ObsidianIcon";
import { ObsidianLiveEditor } from "./common/ObsidianLiveEditor";

const InputAreaControl: React.FC = React.memo(() => {
  const { view } = useAppContext();
  const {
    date,
    granularity,
    isToday,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
    handleChangeCalendarDate,
  } = useMFDIContext();

  return (
    <Flex align="center" paddingX="1em">
      <Box flex="1" />
      <HStack justify="center" flex="0 0 auto">
        <ObsidianIcon
          name="chevron-left"
          boxSize="1.5em"
          cursor="pointer"
          onClick={handleClickMovePrevious}
        />
        <Box textAlign={"center"} marginY={"1em"}>
          <Button
            marginRight={"0.3em"}
            fontSize={"80%"}
            width="3em"
            height="2em"
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
            size="md"
            type={granularityConfig[granularity].inputType}
            value={date.format(granularityConfig[granularity].inputFormat)}
            onChange={handleChangeCalendarDate}
            width={granularity === "year" ? "5.5em" : "9em"}
          />
          {granularityConfig[granularity].showWeekday && (
            <Box as="span" marginLeft={"0.2em"} fontSize={"95%"}>
              {replaceDayToJa(date.format("(ddd)"))}
            </Box>
          )}
        </Box>
        <ObsidianIcon
          name="chevron-right"
          boxSize="1.5em"
          cursor="pointer"
          onClick={handleClickMoveNext}
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
      className="mfdi-input-area"
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
