import { Box, Flex } from "@chakra-ui/react";
import * as React from "react";
import { granularityConfig } from "../config/granularity-config";
import { Granularity } from "../types";
import { ObsidianIcon } from "./common/ObsidianIcon";

interface EmptyStateProps {
  granularity: Granularity;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ granularity }) => {
  return (
    <Flex
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      gap="var(--size-4-3)"
      color="var(--text-faint)"
      style={{ userSelect: "none", pointerEvents: "none" }}
    >
      <ObsidianIcon name="feather" boxSize="2.5em" opacity={0.35} />
      <Box fontSize="var(--font-ui-small)" opacity={0.6} textAlign="center">
        この{granularityConfig[granularity].label}の記録はまだありません
      </Box>
    </Flex>
  );
};
