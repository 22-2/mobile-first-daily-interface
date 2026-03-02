import { Box, BoxProps } from "@chakra-ui/react";
import * as React from "react";

export const Card = (props: BoxProps) => {
  const { children, onContextMenu, onDoubleClick, ...rest } = props as any;

  return (
    <Box
      className="mfdi-card"
      position="relative"
      borderRadius={"22px"}
      borderBottomRightRadius={"6px"}
      borderStyle={"solid"}
      borderWidth={"1px"}
      borderColor={"var(--table-border-color)"}
      background={"var(--background-primary)"}
      color={"var(--text-normal)"}
      marginY="var(--size-4-3)"
      transition="all 0.18s ease"
      boxShadow={"0 4px 12px rgba(0,0,0,0.06)"}
      _hover={{
        boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
        backgroundColor: "var(--background-secondary)",
      }}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      {...rest}
    >
      {children}
    </Box>
  );
};

export default Card;
