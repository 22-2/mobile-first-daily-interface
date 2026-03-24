import { Box, HStack, Text } from "@chakra-ui/react";

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
    <HStack justify="space-between" px={2} mb={1} className={className}>
      <Text
        fontSize="11px"
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
      py={1.5}
      borderRadius="6px"
      bg={isSelected ? activeBg : "transparent"}
      color={
        isSelected
          ? activeColor
          : isMuted
            ? "var(--text-muted)"
            : "var(--text-normal)"
      }
      cursor={onClick ? "pointer" : "default"}
      fontSize="xs"
      fontWeight={isSelected ? "bold" : "normal"}
      transition="background-color 0.1s ease"
      _hover={
        onClick
          ? {
              bg: isSelected ? activeHoverBg : hoverBg,
            }
          : undefined
      }
      className={className}
      onClick={onClick}
    >
      {children}
    </Box>
  );
};
