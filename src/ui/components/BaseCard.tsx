import { Box, Flex, HStack, Spacer, Tag } from "@chakra-ui/react";
import * as React from "react";
import {
  DISPLAY_DATE_TIME_FORMAT,
  DISPLAY_TIME_FORMAT,
} from "src/ui/config/date-formats";
import { DateFilter, Granularity, MomentLike } from "src/ui/types";

interface BaseCardProps {
  timestamp: MomentLike;
  granularity: Granularity;
  dateFilter?: DateFilter;
  isDimmed: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  footerAddon?: React.ReactNode;
  footerRightAddon?: React.ReactNode;
}

export const BaseCard: React.FC<BaseCardProps> = ({
  timestamp,
  granularity,
  dateFilter,
  isDimmed,
  onContextMenu,
  onDoubleClick,
  children,
  footerAddon,
  footerRightAddon,
}) => {
  return (
    <Flex
      direction="column"
      maxHeight={"50vh"}
      padding={"var(--size-4-2)"}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      opacity={isDimmed ? 0.6 : 1}
      filter={isDimmed ? "grayscale(40%)" : "none"}
    >
      <Box
        padding={5}
        paddingTop={4}
        className="markdown-rendered"
        overflowY="auto"
        flex="1"
        sx={{
          "&::-webkit-scrollbar": {
            width: "var(--size-4-1)",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "transparent",
            borderRadius: "var(--size-2-5)",
          },
          "&:hover::-webkit-scrollbar-thumb": {
            backgroundColor: "var(--scrollbar-thumb-bg, rgba(0,0,0,0.1))",
          },
          scrollbarWidth: "none",
          "&:hover": {
            scrollbarWidth: "thin",
          },
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <HStack
        color={"var(--text-muted)"}
        fontSize={"80%"}
        padding={3}
        paddingTop={0}
        paddingRight={4}
        align="center"
        gap={3}
      >
        {footerAddon}
        <Spacer />
        <HStack gap={2}>
          {footerRightAddon}
          <Tag
            size="sm"
            variant="subtle"
            colorScheme="gray"
            borderRadius="full"
          >
            {timestamp.format(
              granularity === "day" && dateFilter !== "this_week"
                ? DISPLAY_TIME_FORMAT
                : DISPLAY_DATE_TIME_FORMAT,
            )}
          </Tag>
        </HStack>
      </HStack>
    </Flex>
  );
};
