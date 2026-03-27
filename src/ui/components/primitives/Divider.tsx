import React from "react";

export type DividerProps = React.HTMLAttributes<HTMLHRElement> & {
  className?: string;
};

export const Divider = ({ className, ...rest }: DividerProps) => (
  <hr className={className} {...rest} />
);

Divider.displayName = "Divider";
