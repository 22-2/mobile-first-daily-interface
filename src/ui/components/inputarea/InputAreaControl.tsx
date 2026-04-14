import { useShallow } from "node_modules/zustand/esm/shallow.mjs";
import { memo, useCallback, useMemo, type ChangeEvent, type FC } from "react";
import { NavButton } from "src/ui/components/common/NavButton";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { DisplayModeIndicator } from "src/ui/components/inputarea/DisplayModeIndicator";
import { Box, Flex, HStack, Input } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { useAppStore } from "src/ui/store/appStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isDefaultViewState } from "src/ui/utils/view-state";
import { getMFDIViewCapabilities } from "src/ui/view/state";

export const InputAreaControl: FC<{
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
