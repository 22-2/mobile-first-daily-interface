import React from "react";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

export const Badge = ({ children, className, style, ...rest }: BadgeProps) => {
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
};
