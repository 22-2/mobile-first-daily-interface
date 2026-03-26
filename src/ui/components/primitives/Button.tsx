import React, { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "src/ui/components/primitives/utils";

// Button: Tailwind ベースのシンプルなボタンコンポーネント。
// 目的: 既存 Chakra Button の代替として見た目を整えつつ、Props の互換を保つ。
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "default";
  size?: "sm" | "md" | "lg";
  className?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const { variant = "default", size = "md", className, children, disabled, ...rest } = props;

  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants: Record<string, string> = {
    default: "bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50",
    ghost: "bg-transparent hover:bg-gray-100",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1.5 text-sm",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const classes = cn(base, variants[variant] ?? variants.default, sizes[size] ?? sizes.md, className);

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <button ref={ref} type="button" className={classes} disabled={disabled} {...rest}>
      {children}
    </button>
  );
});

Button.displayName = "Button";
