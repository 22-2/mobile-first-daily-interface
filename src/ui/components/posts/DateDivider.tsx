import type { FC } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { replaceDayToJa } from "src/core/strings";
import { Box, Flex, Text } from "src/ui/components/primitives";
import type { MomentLike } from "src/ui/types";

interface DateDividerProps {
  date: MomentLike;
  collapsed?: boolean;
  onClick?: () => void;
}

export const DateDivider: FC<DateDividerProps> = ({
  date,
  collapsed = false,
  onClick,
}) => {
  const clickable = typeof onClick === "function";

  return (
    <Flex
      className="mfdi-date-divider items-center py-[var(--size-4-4)] px-[var(--size-4-4)] gap-[var(--size-4-4)]"
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <Box className="flex-1 h-[1px] bg-[var(--background-modifier-border)] opacity-50" />
      <Text className="flex items-center gap-1 text-[length:var(--font-ui-small)] font-semibold text-[var(--text-muted)] whitespace-nowrap tracking-[0.05em] uppercase">
        {clickable && (
          <ObsidianIcon
            className="cursor-pointer"
            name={collapsed ? "chevron-right" : "chevron-down"}
            boxSize="0.95em"
          />
        )}
        {replaceDayToJa(date.format("YYYY-MM-DD (ddd)"))}
      </Text>
      <Box className="flex-1 h-[1px] bg-[var(--background-modifier-border)] opacity-50" />
    </Flex>
  );
};
