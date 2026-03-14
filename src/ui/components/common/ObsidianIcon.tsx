import { Box, BoxProps } from "@chakra-ui/react";
import { setIcon } from "obsidian";
import * as React from "react";
import { useEffect, useRef } from "react";

interface ObsidianIconProps extends BoxProps {
  name: string;
  size?: number | string;
}

export const ObsidianIcon = ({ name, size, ...props }: ObsidianIconProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      if (typeof ref.current.empty === "function") {
        ref.current.empty();
      } else {
        ref.current.innerHTML = "";
      }
      try {
        setIcon(ref.current, name);
      } catch (e) {}
      const svg = ref.current.querySelector("svg");
      if (svg) {
        if (size) {
          const s = typeof size === "number" ? `${size}px` : size;
          svg.setCssStyles({
            width: s,
            height: s,
          });
        } else {
          svg.setCssStyles({
            width: "100%",
            height: "100%",
          });
        }
      }
    }
  }, [name, size]);

  return (
    <Box
      ref={ref}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      {...props}
    />
  );
};
