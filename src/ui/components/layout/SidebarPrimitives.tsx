import { Box, HStack, Text } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";

export const SidebarSectionHeader: React.FC<{
  children: React.ReactNode;
  rightAddon?: React.ReactNode;
  className?: string;
}> = ({ children, rightAddon, className }) => {
  return (
    <HStack
      className={cn(
        "sidebar-section-header",
        "justify-between px-2 py-[var(--size-4-1)] mb-1 mt-[var(--size-4-2)]",
        className,
      )}
    >
      <Text className="text-[length:var(--font-ui-small)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
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
      className={cn(
        "sidebar-text-button",
        "flex items-center px-3 h-[24px]",
        "rounded-[var(--radius-s)] text-[length:var(--font-ui-small)]",
        "leading-[1.2] whitespace-nowrap",
        "transition-colors duration-100 ease-in-out",
        isSelected
          ? "font-bold text-[var(--color-accent)] sidebar-text-button--selected"
          : isMuted
            ? "font-normal text-[var(--text-muted)]"
            : "font-normal text-[var(--text-normal)]",
        isMuted && "sidebar-text-button--muted",
        onClick ? "cursor-pointer" : "cursor-default",
        onClick &&
          isSelected &&
          "hover:bg-[color-mix(in_srgb,var(--color-accent),transparent_80%)]",
        onClick && !isSelected && "hover:bg-[var(--background-modifier-hover)]",
        className,
      )}
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
    <Text className="sidebar-item-count text-xs text-[var(--text-muted)] ml-1 flex-shrink-0 leading-none">
      {children}
    </Text>
  );
};
