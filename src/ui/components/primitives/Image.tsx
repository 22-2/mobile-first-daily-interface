import React from "react";
import { cn } from "src/ui/components/primitives/utils";

export type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & { className?: string };

export const Image = ({ className, ...rest }: ImageProps) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <img className={cn(className)} {...rest} />
);

Image.displayName = "Image";
