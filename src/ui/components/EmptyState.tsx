import { Box, Flex } from "@chakra-ui/react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import type { Granularity } from "src/ui/types";

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
      <ObsidianIcon name="feather" boxSize="var(--mfdi-icon-size-large)" opacity={0.35} />
      <Box fontSize="var(--font-ui-small)" opacity={0.6} textAlign="center">
        この{GRANULARITY_CONFIG[granularity].label}の記録はまだありません
      </Box>
    </Flex>
  );
};
