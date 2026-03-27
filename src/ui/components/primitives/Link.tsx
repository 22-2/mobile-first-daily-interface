import React from "react";
import { cn } from "src/ui/components/primitives/utils";

export type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { className?: string };

export const Link = ({ className, ...rest }: LinkProps) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <a className={cn(className)} {...rest} />
);

Link.displayName = "Link";
