import { Box, Button, Flex, HStack, Input } from "@chakra-ui/react";
import { App } from "obsidian";
import * as React from "react";
import { ChangeEvent } from "react";
import { replaceDayToJa } from "../../utils/strings";
import { granularityConfig } from "../granularity-config";
import { ObsidianIcon } from "../ObsidianIcon";
import { ObsidianLiveEditor } from "../ObsidianLiveEditor";
import { Granularity, MomentLike, Post } from "../types";
import { ObsidianLiveEditorRef } from "../ObsidianLiveEditor";
import { useAppContext } from "../context/AppContext";

interface InputAreaProps {
  date: MomentLike;
  granularity: Granularity;
  input: string;
  setInput: (v: string) => void;
  asTask: boolean;
  editingPost: Post | null;
  canSubmit: boolean;
  inputRef: React.RefObject<ObsidianLiveEditorRef>;
  handlers: {
    handleClickMovePrevious: () => void;
    handleClickMoveNext: () => void;
    handleClickToday: () => void;
    handleChangeCalendarDate: (event: ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: () => void;
    cancelEdit: () => void;
  };
}

export const InputArea: React.FC<InputAreaProps> = ({
  date,
  granularity,
  input,
  setInput,
  asTask,
  editingPost,
  canSubmit,
  inputRef,
  handlers,
}) => {
  const { app, view } = useAppContext();
  const isToday = date.isSame(window.moment(), granularityConfig[granularity].unit);

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
      <HStack justify="center">
        <ObsidianIcon
          name="chevron-left"
          boxSize="1.5em"
          cursor="pointer"
          onClick={handlers.handleClickMovePrevious}
        />

        <Box textAlign={"center"} marginY={"1em"}>
          <Button
            marginRight={"0.3em"}
            fontSize={"80%"}
            width="3em"
            height="2em"
            cursor="pointer"
            onClick={handlers.handleClickToday}
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
            onChange={handlers.handleChangeCalendarDate}
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
          onClick={handlers.handleClickMoveNext}
        />
      </HStack>

      <ObsidianLiveEditor
        ref={inputRef}
        leaf={view.leaf}
        app={app}
        value={input}
        onChange={setInput}
        minHeight="var(--size-4-18)"
        marginX="var(--size-4-4)"
        onKeyDownCapture={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            handlers.handleSubmit();
          }
        }}
      />

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
            onClick={handlers.cancelEdit}
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
          onClick={handlers.handleSubmit}
        >
          {editingPost ? "更新" : asTask ? "タスク追加" : "投稿"}
        </Button>
      </HStack>
    </Flex>
  );
};
