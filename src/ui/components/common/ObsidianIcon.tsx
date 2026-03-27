import { setIcon } from "obsidian";
import React, { useEffect, useRef } from "react";
import { Box } from "src/ui/components/primitives";
import type { BoxProps } from "src/ui/components/primitives/Box";
import { cn } from "src/ui/components/primitives/utils";

interface ObsidianIconProps extends BoxProps {
  name: string;
  size?: number | string;
  boxSize?: number | string;
  width?: number | string;
  height?: number | string;
}

export const ObsidianIcon = React.forwardRef<HTMLDivElement, ObsidianIconProps>(
  (
    { name, size, boxSize, width, height, className, ...restProps },
    forwardedRef,
  ) => {
    const innerRef = useRef<HTMLDivElement | null>(null);

    // keep forwarded ref in sync
    useEffect(() => {
      if (!forwardedRef) return;
      const node = innerRef.current;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (typeof forwardedRef === "object" && forwardedRef !== null) {
        (forwardedRef as React.RefObject<HTMLDivElement | null>).current = node;
      }
    }, [forwardedRef]);

    useEffect(() => {
      const refEl = innerRef.current;
      if (!refEl) return;

      // Clear previous icon contents if API available
      const maybeEmpty = (refEl as unknown as { empty?: () => void }).empty;
      if (typeof maybeEmpty === "function") {
        maybeEmpty.call(refEl);
      } else {
        refEl.innerHTML = "";
      }

      try {
        setIcon(refEl, name);
      } catch {
        // ignore
      }

      const svg = refEl.querySelector("svg");
      if (!svg) return;

      const s = size ?? boxSize ?? width ?? height;
      const setter = svg as unknown as {
        setCssStyles?: (styles: Record<string, string>) => void;
      };
      if (s) {
        const ss = typeof s === "number" ? `${s}px` : String(s);
        setter.setCssStyles?.({ width: ss, height: ss });
      } else {
        setter.setCssStyles?.({ width: "100%", height: "100%" });
      }
    }, [name, size, boxSize, width, height]);

    const base =
      "inline-flex items-center justify-center text-[var(--icon-color)] transition-all duration-150 px-[var(--size-2-3)] py-[var(--size-2-2)] rounded-[var(--corner-shape)] hover:text-[var(--icon-color-hover)] cursor-pointer";

    return (
      <Box ref={innerRef} className={cn(base, className)} {...restProps} />
    );
  },
);

ObsidianIcon.displayName = "ObsidianIcon";
