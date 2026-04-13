import type React from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { cn } from "src/ui/components/primitives/utils";

// ─────────────────────────────────────────────
// サブコンポーネント (Tailwind化)
// ─────────────────────────────────────────────
export const CalendarHeader: React.FC<{
  viewDate: moment.Moment;
  date: moment.Moment;
  granularity: string;
  onPrev: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
  onSelectYear: (e: React.MouseEvent) => void;
  onSelectMonth: (e: React.MouseEvent) => void;
}> = ({
  viewDate,
  date,
  granularity,
  onPrev,
  onNext,
  onSelectYear,
  onSelectMonth,
}) => {
  const isSameYear = viewDate.isSame(date, "year");
  const isSameMonth = viewDate.isSame(date, "month");

  const highlightYear =
    ((granularity === "year" || granularity === "quarter") && isSameYear) ||
    (granularity === "month" && isSameMonth);
  const highlightMonth = granularity === "month" && isSameMonth;

  return (
    <div className="mini-calendar__header flex w-full justify-between items-center px-1">
      <div className="mini-calendar__month-label flex items-center gap-1 ml-[var(--size-4-2)]">
        <span
          className={cn(
            "font-bold text-lg cursor-pointer rounded-[4px] px-1 hover:bg-[var(--background-modifier-hover)]",
            highlightYear
              ? "text-[var(--color-accent)]"
              : "text-[var(--text-normal)]",
          )}
          onClick={onSelectYear}
        >
          {viewDate.format("YYYY年")}
        </span>
        <span
          className={cn(
            "font-bold text-lg cursor-pointer rounded-[4px] px-1 hover:bg-[var(--background-modifier-hover)]",
            highlightMonth
              ? "text-[var(--color-accent)]"
              : "text-[var(--text-normal)]",
          )}
          onClick={onSelectMonth}
        >
          {viewDate.format("M月")}
        </span>
      </div>
      <div className="mini-calendar__nav flex items-center gap-1">
        {(["chevron-left", "chevron-right"] as const).map((icon, i) => (
          <div
            key={icon}
            className="mini-calendar__nav-button p-1.5 rounded-[4px] hover:bg-[var(--background-modifier-hover)] cursor-pointer"
            onClick={i === 0 ? onPrev : onNext}
          >
            <ObsidianIcon name={icon} size="1.2em" />
          </div>
        ))}
      </div>
    </div>
  );
};
