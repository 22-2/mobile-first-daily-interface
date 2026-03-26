import type { ComponentPropsWithRef, ElementType } from "react";
import React, { forwardRef } from "react";
import { cn } from "src/ui/components/primitives/utils";

// Box: シンプルな div ラッパー。`as` で要素を切り替え可能にしておくことで再利用性を高める。
export type BoxProps<T extends ElementType = "div"> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithRef<T>, "className">;

export const Box = forwardRef<HTMLElement, BoxProps>((props, ref) => {
  const { as: Comp = "div", className, children, ...rest } = props as any;
  return (
    // 目的: Tailwind クラスを渡せるようにして、既存の Chakra `Box` の代替として使えるようにする
    // メンタルモデル: 最小限のラッパーで余計な振る舞いを持たせない
    // eslint-disable-next-line react/jsx-props-no-spreading
    React.createElement(Comp as any, { ref, className: cn(className), ...rest }, children)
  );
});

Box.displayName = "Box";
