import { Box } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";

export const SidebarContainer: React.FC<{
  isOpen: boolean;
  children: React.ReactNode;
}> = ({ isOpen, children }) => {
  return (
    <Box
      className={cn(
        isOpen
          ? "flex w-[260px] min-w-[260px] ml-[var(--size-4-2)]"
          : "hidden w-0 min-w-0",
        "h-full flex-col py-[var(--size-4-2)] px-0 mr-[var(--size-4-2)] transition-all duration-200 overflow-hidden",
      )}
    >
      {children}
    </Box>
  );
};
