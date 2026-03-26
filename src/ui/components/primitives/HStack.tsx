import React, { forwardRef } from "react";
import type { ComponentPropsWithRef, ElementType } from "react";
import { cn } from "src/ui/components/primitives/utils";

// HStack: 横並びのスタック（Tailwind クラスで表現）。埋め込み style を使わない。
export type HStackProps<T extends ElementType = "div"> = {
  as?: T;
  gap?: string | number;
  align?: "center" | "start" | "end" | string;
  justify?: "center" | "start" | "end" | "between" | string;
  className?: string;
} & Omit<ComponentPropsWithRef<T>, "className" | "style">;

export const HStack = forwardRef<HTMLElement, HStackProps>((props, ref) => {
  const { as: Comp = "div", gap = "0.5rem", align = "center", justify, className, children, ...rest } = props as any;

  const gapClass = typeof gap === "number" ? `gap-[${gap}px]` : `gap-[${String(gap)}]`;
  const alignMap: Record<string, string> = {
    center: "items-center",
    start: "items-start",
    end: "items-end",
  };
  const justifyMap: Record<string, string> = {
    center: "justify-center",
    start: "justify-start",
    end: "justify-end",
    between: "justify-between",
  };

  const classes = cn("flex flex-row", gapClass, alignMap[align] ?? "", justifyMap[justify] ?? "", className);

  // eslint-disable-next-line react/jsx-props-no-spreading
  return React.createElement(Comp, { ref, className: classes, ...rest }, children);
});

HStack.displayName = "HStack";
