import React from "react";
import { Flex } from "src/ui/components/primitives/Flex";
import type { Sprinkles } from "src/styles/sprinkles.css";

type HStackProps = React.HTMLAttributes<HTMLElement> & {
  spr?: Sprinkles;
  spacing?: keyof Sprinkles; // best-effort; consumers can pass spr={{ gap: '4' }} instead
};

export const HStack = ({ spr, spacing, children, ...rest }: HStackProps) => {
  const extra = spacing
    ? ({ gap: spacing } as unknown as Sprinkles)
    : undefined;
  return (
    <Flex spr={Object.assign({}, extra, spr)} {...rest}>
      {children}
    </Flex>
  );
};

// Named export only (no default export to match project import style)
