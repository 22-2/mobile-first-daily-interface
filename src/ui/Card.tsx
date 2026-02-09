import * as React from "react";
import { Box, BoxProps } from "@chakra-ui/react";

export const Card = (props: BoxProps) => {
  const { children, onContextMenu, onDoubleClick, ...rest } = props as any;

  return (
    <Box
      borderStyle={"solid"}
      borderRadius={"12px"}
      borderColor={"var(--table-border-color)"}
      borderWidth={"1px"}
      boxShadow={"0 4px 12px rgba(0,0,0,0.06)"}
      marginY={6}
      overflow="hidden"
      transition="all 0.15s ease"
      _hover={{ transform: "translateY(-4px)", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      {...rest}
    >
      {children}
    </Box>
  );
};

export default Card;
