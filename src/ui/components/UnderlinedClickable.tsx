import { Box } from "@chakra-ui/react";
import * as React from "react";

interface UnderlinedClickableProps {
  children: React.ReactNode;
  onContextMenu: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export const UnderlinedClickable: React.FC<UnderlinedClickableProps> = ({
  children,
  onContextMenu,
  onClick,
}) => {
  return (
    <Box
      as="span"
      cursor="pointer"
      _hover={{ textDecoration: "underline" }}
      onContextMenu={onContextMenu}
      onClick={onClick}
    >
      {children}
    </Box>
  );
};
