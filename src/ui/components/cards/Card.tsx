import type React from "react";
import { Box } from "src/ui/components/primitives";

export const Card = (props: React.ComponentPropsWithoutRef<"div">) => {
  const { children, onContextMenu, onDoubleClick, className, ...rest } = props;

  // ハイライト中は mfdi-card--highlighted の background が優先されるべきなので
  // postcss の safe-important-v4 により hover:bg-* にも !important が付くことを回避する
  const isHighlighted = className?.includes("mfdi-card--highlighted") ?? false;

  return (
    <Box
      className={`mfdi-card relative rounded-sm [border-bottom-right-radius:6px] text-[var(--text-normal)] my-[var(--size-4-1)] transition-all duration-150 shadow-[var(--shadow-xs)] ${isHighlighted ? "" : "hover:bg-[var(--background-secondary)]"} ${className ?? ""}`}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      {...rest}
    >
      {children}
    </Box>
  );
};
