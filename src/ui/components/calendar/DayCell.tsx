import type React from "react";
import { cn } from "src/ui/components/primitives/utils";
import type { DayCellProps } from "./types";
import { Box } from "../primitives";

type Props = DayCellProps & { showRangeHighlight: boolean };

export const DayCell: React.FC<Props> = ({
  day,
  isSelectedDay,
  isInSelectedRange,
  isCurrentMonth,
  hasPost,
  showRangeHighlight,
  onClick,
}) => {
  const isToday        = day.isSame(window.moment(), "day");
  const isForeground   = isCurrentMonth || isSelectedDay || isInSelectedRange || isToday;
  const effectiveInRange = showRangeHighlight && isInSelectedRange;

  // ---- className helpers ----

  const backgroundCx = isToday
    ? "bg-[var(--color-accent)]! text-[var(--text-on-accent)]"
    : effectiveInRange
      ? "bg-[color-mix(in_srgb,var(--color-accent),transparent_85%)] text-[var(--color-accent)]"
      : "bg-transparent";

  const textCx =
    !isToday && !effectiveInRange
      ? isForeground
        ? "text-[var(--text-normal)]"
        : "text-[var(--text-faint)]"
      : undefined;

  const hoverCx = isToday
    ? "hover:bg-[var(--color-accent-2)]"
    : "hover:bg-[color-mix(in_srgb,var(--color-accent),transparent_75%)]";

  const dotColorCx = isToday
    ? "bg-[var(--text-on-accent)]"
    : effectiveInRange
      ? "bg-[var(--color-accent)]"
      : "bg-[var(--text-muted)]";

  // ---- render ----

  return (
    <Box
      className={cn(
        "mini-calendar__day-cell relative cursor-pointer",
        "flex items-center justify-center",   // ← 追加
        "w-full aspect-square",               // ← 正方形に統一
        "transition-all duration-100 ease-in-out",
        (isToday || effectiveInRange) ? "font-bold" : "font-normal",
        backgroundCx,
        textCx,
        hoverCx,
      )}
      onClick={() => onClick(day)}
    >
      {day.date()}

      {hasPost && (
        <Box
          className={cn(
            "mini-calendar__dot absolute bottom-1 left-1/2 -translate-x-1/2",
            "w-1 h-1 rounded-full",
            dotColorCx,
          )}
        />
      )}
    </Box>
  );
};
