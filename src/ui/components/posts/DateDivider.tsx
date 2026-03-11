import { Box, Flex, Text } from "@chakra-ui/react";
import * as React from "react";
import { MomentLike } from "src/ui/types";
import { replaceDayToJa } from "src/utils/strings";

interface DateDividerProps {
  date: MomentLike;
}

export const DateDivider: React.FC<DateDividerProps> = ({ date }) => {
  return (
    <Flex
      align="center"
      className="mfdi-date-divider"
      py="var(--size-4-4)"
      px="var(--size-4-4)"
      gap="var(--size-4-4)"
    >
      <Box flex="1" height="1px" bg="var(--background-modifier-border)" opacity={0.5} />
      <Text
        fontSize="var(--font-smallest)"
        fontWeight="600"
        color="var(--text-muted)"
        whiteSpace="nowrap"
        letterSpacing="0.05em"
        textTransform="uppercase"
      >
        {replaceDayToJa(date.format("YYYY-MM-DD (ddd)"))}
      </Text>
      <Box flex="1" height="1px" bg="var(--background-modifier-border)" opacity={0.5} />
    </Flex>
  );
};
