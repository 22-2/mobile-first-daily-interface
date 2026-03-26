import React from "react";
import { Flex } from "src/ui/components/primitives/Flex";
import type { Sprinkles } from "src/styles/sprinkles.css";

type VStackProps = React.HTMLAttributes<HTMLElement> & {
  spr?: Sprinkles;
  spacing?: keyof Sprinkles;
};

export const VStack = ({ spr, spacing, children, ...rest }: VStackProps) => {
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
