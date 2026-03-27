import React from "react";
import { cn } from "src/ui/components/primitives/utils";

export type SpacerProps = React.HTMLAttributes<HTMLDivElement> & { className?: string };

export const Spacer = ({ className, ...rest }: SpacerProps) => (
  <div className={cn("flex-1", className)} {...rest} />
);

Spacer.displayName = "Spacer";
