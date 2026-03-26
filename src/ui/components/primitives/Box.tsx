import React from "react";
import type { ElementType } from "react";
import clsx from "clsx";
import { sprinkles } from "src/styles/sprinkles.css";
import type { Sprinkles } from "src/styles/sprinkles.css";

type BoxProps = React.HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  spr?: Sprinkles;
};

export const Box = ({
  as: As = "div",
  spr,
  className,
  children,
  ...rest
}: BoxProps) => {
  const sprClass = spr ? sprinkles(spr) : undefined;
  return (
    // intent: thin wrapper similar to Chakra's Box; keeps markup and accepts sprinkles
    // so existing code can import this instead of Chakra's Box and opt into spr usage.
    <As className={clsx(sprClass, className)} {...rest}>
      {children}
    </As>
  );
};

// Named export only (no default export to match project import style)
