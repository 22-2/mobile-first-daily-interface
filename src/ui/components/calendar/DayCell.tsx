import type React from "node_modules/@types/react";
import { cn } from "../primitives/utils";
import type { DayCellProps } from "./types";

export const DayCell: React.FC<DayCellProps & { showRangeHighlight: boolean; }> = ({
  day, isSelectedDay, isInSelectedRange, isCurrentMonth, hasPost, showRangeHighlight, onClick,
}) => {
  const isToday = day.isSame(window.moment(), "day");
  const isForeground = isCurrentMonth || isSelectedDay || isInSelectedRange || isToday;
  const effectiveInRange = showRangeHighlight && isInSelectedRange;

  return (
    <div
      className={cn(
        "mini-calendar__day-cell relative cursor-pointer p-1.5 transition-all duration-100 ease-in-out",
        // Background logic
        isToday
          ? "bg-[var(--color-accent)]! text-[var(--text-on-accent)]"
          : effectiveInRange
            ? "bg-[color-mix(in_srgb,var(--color-accent),transparent_85%)] text-[var(--color-accent)]"
            : "bg-transparent",
        // Text Color & Weight
        !isToday && !effectiveInRange && (isForeground ? "text-[var(--text-normal)]" : "text-[var(--text-faint)]"),
        (isToday || effectiveInRange) ? "font-bold" : "font-normal",
        // Hover
        isToday
          ? "hover:bg-[var(--color-accent-2)]"
          : "hover:bg-[color-mix(in_srgb,var(--color-accent),transparent_75%)]"
      )}
      onClick={() => onClick(day)}
    >
      {day.date()}
      {hasPost && (
        <div
          className={cn(
            "mini-calendar__dot absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
            isToday ? "bg-[var(--text-on-accent)]" : effectiveInRange ? "bg-[var(--color-accent)]" : "bg-[var(--text-muted)]"
          )} />
      )}
    </div>
  );
};
