import { Box, BoxProps } from "@chakra-ui/react";
import * as React from "react";

interface UnderlinedClickableProps extends BoxProps {
}

export const UnderlinedClickable: React.FC<UnderlinedClickableProps> = ({
  children,
  onContextMenu,
  onClick,
  ...props
}) => {
  return (
    <Box
      as="span"
      cursor="pointer"
      _hover={{ textDecoration: "underline" }}
      onContextMenu={onContextMenu}
      onClick={onClick}
      {...props}
    >
      {children}
    </Box>
  );
};
