import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(props, ref) {
    const { className, style, ...rest } = props;
    return <input ref={ref} className={className} style={style} {...rest} />;
  },
);

Input.displayName = "Input";
