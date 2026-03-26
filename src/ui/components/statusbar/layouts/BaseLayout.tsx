import type { BoxProps } from "@chakra-ui/react";
import { Box, HStack } from "@chakra-ui/react";
import { clsx } from "clsx";
import type { FC, ReactNode } from "react";

type BaseLayoutProps = BoxProps & {
  leftItems?: ReactNode;
  rightItems?: ReactNode;
  className?: string;
};

export const BaseLayout: FC<BaseLayoutProps> = ({
  leftItems: left,
  rightItems: right,
  className,
  ...props
}) => {
  return (
    <HStack
      className={clsx("base-layout", className)}
      fontSize="var(--font-ui-smaller)"
      color="var(--text-muted)"
      marginX="var(--size-4-4)"
      marginY="var(--size-4-2)"
      opacity={0.8}
      spacing={0}
      justifyContent="space-between"
      width="100%"
      {...props}
    >
      {left && <Box>{left}</Box>}
      {right && <Box>{right}</Box>}
    </HStack>
  );
};
