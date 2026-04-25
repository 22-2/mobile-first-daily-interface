import type { KeyboardEvent, MouseEventHandler } from "react";
import { memo, useCallback } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { cn } from "src/ui/components/primitives/utils";

type InputAreaIconProps = {
  name: string;
  ariaLabel: string;
  title?: string;
  onActivate?: () => void;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
  isDisabled?: boolean;
  className?: string;
};

export const InputAreaIcon = memo(
  ({
    name,
    ariaLabel,
    title,
    onActivate,
    onContextMenu,
    isDisabled = false,
    className,
  }: InputAreaIconProps) => {
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (isDisabled || !onActivate) return;
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        onActivate();
      },
      [isDisabled, onActivate],
    );

    return (
      <ObsidianIcon
        name={name}
        size={"1.25em"}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        className={cn(
          "h-[1.7em] w-[1.7em] rounded-[var(--corner-shape)] hover:bg-[var(--interactive-hover)]",
          className,
        )}
        onClick={isDisabled ? undefined : onActivate}
        onKeyDown={handleKeyDown}
        onContextMenu={onContextMenu}
      />
    );
  },
);

InputAreaIcon.displayName = "InputAreaIcon";
