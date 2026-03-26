import type { BoxProps } from "@chakra-ui/react";
import { Box } from "@chakra-ui/react";
import { setIcon } from "obsidian";
import React, { useEffect, useRef } from "react";

interface ObsidianIconProps extends BoxProps {
  name: string;
  size?: number | string;
}

export const ObsidianIcon = React.forwardRef<HTMLDivElement, ObsidianIconProps>(
  ({ name, size, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLDivElement | null>(null);

    // keep forwarded ref in sync
    useEffect(() => {
      if (!forwardedRef) return;
      const node = innerRef.current;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef && typeof forwardedRef === "object") {
        (
          forwardedRef as React.MutableRefObject<HTMLDivElement | null>
        ).current = node;
      }
    }, [forwardedRef]);

    useEffect(() => {
      const refEl = innerRef.current;
      if (refEl) {
        refEl.empty();
        setIcon(refEl, name);
        const svg = refEl.querySelector("svg");
        if (svg) {
          const s =
            size ??
            props.boxSize ??
            props.width ??
            props.height;
          if (s) {
            const ss = typeof s === "number" ? `${s}px` : String(s);
            svg.setCssStyles?.({ width: ss, height: ss });
          } else {
            svg.setCssStyles?.({ width: "100%", height: "100%" });
          }
        }
      }
    }, [name, size, props]);

    return (
      <Box
        ref={innerRef}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        color="var(--mfdi-icon-color)"
        cursor="pointer"
        transition="all 0.15s"
        _hover={{ color: "var(--mfdi-icon-color-hover)" }}
        {...props}
      />
    );
  },
);

ObsidianIcon.displayName = "ObsidianIcon";
