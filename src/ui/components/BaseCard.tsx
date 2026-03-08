import { Box, Flex, HStack, Spacer, Tag } from "@chakra-ui/react";
import * as React from "react";
import {
    DISPLAY_DATE_TIME_FORMAT,
    DISPLAY_TIME_FORMAT
} from "../config/date-formats";
import { Granularity, MomentLike, TimeFilter } from "../types";

interface BaseCardProps {
  timestamp: MomentLike;
  granularity: Granularity;
  timeFilter?: TimeFilter;
  isDimmed: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  footerAddon?: React.ReactNode;
}

export const BaseCard: React.FC<BaseCardProps> = ({
  timestamp,
  granularity,
  timeFilter,
  isDimmed,
  onContextMenu,
  onDoubleClick,
  children,
  footerAddon,
}) => {
  return (
    <Flex
      direction="column"
      maxHeight={"50vh"}
      padding={"var(--size-4-2)"}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      opacity={isDimmed ? 0.45 : 1}
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
            width: "4px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "transparent",
            borderRadius: "10px",
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
          <Tag
            size="sm"
            variant="subtle"
            colorScheme="gray"
            borderRadius="full"
          >
            {timestamp.format(
              granularity === "day" && timeFilter !== "this_week"
                ? DISPLAY_TIME_FORMAT
                : DISPLAY_DATE_TIME_FORMAT,
            )}
          </Tag>
        </HStack>
      </HStack>
    </Flex>
  );
};
