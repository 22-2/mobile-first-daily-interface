import React from "react";
import { spacer as spacerClass } from "./Spacer.css";

type SpacerProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
};

export const Spacer = ({ as: As = "div", className, ...rest }: SpacerProps) => {
  const cls = [spacerClass, className].filter(Boolean).join(" ");
  return React.createElement(
    As as React.ElementType,
    Object.assign({ className: cls }, rest),
  );
};
