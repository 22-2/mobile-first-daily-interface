import type React from "react";
import { Box } from "src/ui/components/primitives";

export const Card = (props: React.ComponentPropsWithoutRef<"div">) => {
  const { children, onContextMenu, onDoubleClick, className, ...rest } = props;

  return (
    <Box
      className={`mfdi-card relative rounded-[var(--radius-xl)] [border-bottom-right-radius:6px] border border-[var(--table-border-color)] text-[var(--text-normal)] my-[var(--size-4-1)] transition-all duration-150 shadow-[var(--shadow-xs)] hover:bg-[var(--background-secondary)] ${className ?? ""}`}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      {...rest}
    >
      {children}
    </Box>
  );
};
