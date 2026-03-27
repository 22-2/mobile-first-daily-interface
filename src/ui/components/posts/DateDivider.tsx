import type { FC } from "react";
import { replaceDayToJa } from "src/core/strings";
import { Box, Flex, Text } from "src/ui/components/primitives";
import type { MomentLike } from "src/ui/types";

interface DateDividerProps {
  date: MomentLike;
}

export const DateDivider: FC<DateDividerProps> = ({ date }) => {
  return (
    <Flex className="mfdi-date-divider items-center py-[var(--size-4-4)] px-[var(--size-4-4)] gap-[var(--size-4-4)]">
      <Box className="flex-1 h-[1px] bg-[var(--background-modifier-border)] opacity-50" />
      <Text className="text-[length:var(--font-ui-small)] font-semibold text-[var(--text-muted)] whitespace-nowrap tracking-[0.05em] uppercase">
        {replaceDayToJa(date.format("YYYY-MM-DD (ddd)"))}
      </Text>
      <Box className="flex-1 h-[1px] bg-[var(--background-modifier-border)] opacity-50" />
    </Flex>
  );
};
