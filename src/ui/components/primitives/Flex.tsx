import React from "react";
import type { ElementType } from "react";
import clsx from "clsx";
import { sprinkles } from "src/styles/sprinkles.css";
import type { Sprinkles } from "src/styles/sprinkles.css";
import { Box } from "src/ui/components/primitives/Box";

type FlexProps = React.HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  spr?: Sprinkles;
};

export const Flex = ({
  as: As = "div",
  spr,
  className,
  children,
  ...rest
}: FlexProps) => {
  const base = { display: "flex" } as unknown as Sprinkles;
  const sprClass = sprinkles(Object.assign({}, base, spr || {}));
  return (
    <Box as={As} className={clsx(sprClass, className)} {...rest}>
      {children}
    </Box>
  );
};

// Named export only (no default export to match project import style)
