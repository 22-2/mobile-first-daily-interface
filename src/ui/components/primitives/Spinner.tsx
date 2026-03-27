import React from "react";

export type SpinnerProps = { size?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>;

export const Spinner = ({ size = 16, className, ...rest }: SpinnerProps) => (
  <div
    role="status"
    aria-hidden
    className={className}
    style={{ width: size, height: size }}
    {...rest}
  />
);

Spinner.displayName = "Spinner";
