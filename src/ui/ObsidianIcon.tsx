import { setIcon } from "obsidian";
import * as React from "react";
import { useEffect, useRef } from "react";
import { Box, BoxProps } from "@chakra-ui/react";

interface ObsidianIconProps extends BoxProps {
  name: string;
  size?: number | string;
}

export const ObsidianIcon = ({ name, size, ...props }: ObsidianIconProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.empty();
      setIcon(ref.current, name);
      const svg = ref.current.querySelector("svg");
      if (svg) {
        if (size) {
          const s = typeof size === "number" ? `${size}px` : size;
          svg.style.width = s;
          svg.style.height = s;
        } else {
          svg.style.width = "100%";
          svg.style.height = "100%";
        }
      }
    }
  }, [name, size]);

  return <Box ref={ref} display="inline-flex" alignItems="center" justifyContent="center" {...props} />;
};
