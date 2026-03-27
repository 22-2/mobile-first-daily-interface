import React from "react";
import { cn } from "src/ui/components/primitives/utils";

export type TextProps = React.HTMLAttributes<HTMLElement> & {
  as?: keyof JSX.IntrinsicElements;
  className?: string;
};

export const Text = ({ as: Comp = "span", className, children, ...rest }: TextProps) => {
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    React.createElement(Comp as any, { className: cn(className), ...rest }, children)
  );
};

Text.displayName = "Text";
