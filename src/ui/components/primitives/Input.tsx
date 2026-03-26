import React, { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "src/ui/components/primitives/utils";

// Input: Tailwind ベースのシンプルな input コンポーネント。
export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { className, ...rest } = props;
  const classes = cn(
    "block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1",
    className,
  );

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <input ref={ref} className={classes} {...rest} />
  );
});

Input.displayName = "Input";
