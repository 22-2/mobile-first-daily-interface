import { Box, HStack, Text } from "@chakra-ui/react";
import { clsx } from "clsx";

const activeBg = "color-mix(in srgb, var(--color-accent), transparent 85%)";
const activeHoverBg =
  "color-mix(in srgb, var(--color-accent), transparent 80%)";
const activeColor = "var(--color-accent)";
const hoverBg = "var(--background-modifier-hover)";

export const SidebarSectionHeader: React.FC<{
  children: React.ReactNode;
  rightAddon?: React.ReactNode;
  className?: string;
}> = ({ children, rightAddon, className }) => {
  return (
    <HStack justify="space-between" px={2} py="var(--size-4-1)" mb={1} mt="var(--size-4-2)" className={clsx("sidebar-section-header", className)}>
      <Text
        fontSize="var(--font-ui-small);"
        fontWeight="bold"
        color="var(--text-muted)"
        textTransform="uppercase"
        letterSpacing="0.05em"
      >
        {children}
      </Text>
      {rightAddon}
    </HStack>
  );
};

export const SidebarTextButton: React.FC<{
  isSelected?: boolean;
  isMuted?: boolean;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({
  isSelected = false,
  isMuted = false,
  className,
  onClick,
  children,
}) => {
  return (
    <Box
      px={3}
      py={0}
      borderRadius="6px"
      bg={isSelected ? activeBg : "transparent"}
      color={
        isSelected
          ? activeColor
          : isMuted
            ? "var(--text-muted)"
            : "var(--text-normal)"
      }
      display="flex"
      alignItems="center"
      height="24px"
      cursor={onClick ? "pointer" : "default"}
      fontSize="var(--font-ui-small)"
      lineHeight="1.2"
      fontWeight={isSelected ? "bold" : "normal"}
      transition="background-color 0.1s ease"
      whiteSpace="nowrap"
      _hover={
        onClick
          ? {
              bg: isSelected ? activeHoverBg : hoverBg,
            }
          : undefined
      }
      className={clsx("sidebar-text-button", className)}
      onClick={onClick}
    >
      {children}
    </Box>
  );
};

export const SidebarItemCount: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <Text
      className="sidebar-item-count"
      fontSize="10px"
      lineHeight="1"
      color="var(--text-muted)"
      fontWeight="normal"
      ml={1}
      flexShrink={0}
    >
      {children}
    </Text>
  );
};
