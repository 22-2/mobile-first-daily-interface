import type { BoxProps } from "@chakra-ui/react";
import { Box } from "@chakra-ui/react";

interface UnderlinedClickableProps extends BoxProps {}

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
