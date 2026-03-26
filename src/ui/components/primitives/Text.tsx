import React from "react";
import type { ElementType } from "react";
import clsx from "clsx";
import { sprinkles } from "src/styles/sprinkles.css";
import type { Sprinkles } from "src/styles/sprinkles.css";

type TextProps = React.HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  spr?: Sprinkles;
};

export const Text = ({
  as: As = "span",
  spr,
  className,
  children,
  ...rest
}: TextProps) => {
  const sprClass = spr ? sprinkles(spr) : undefined;
  return (
    <As className={clsx(sprClass, className)} {...rest}>
      {children}
    </As>
  );
};

// Named export only (no default export to match project import style)
