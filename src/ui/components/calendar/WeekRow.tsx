import type React from "node_modules/@types/react";
import { cn } from "../primitives/utils";
import { DayCell } from "./DayCell";
import type { WeekRowProps } from "./MiniCalendar";

export const WeekRow: React.FC<WeekRowProps> = ({
  week, date, granularity, rangeStart, rangeEnd, viewDate, dateFilter, activityDates, onSelectDay, onSelectWeek,
}) => {
  const isWeekSelected = (granularity === "week" || (granularity === "day" && dateFilter === "this_week")) &&
    week[0].isSame(date, "isoWeek");

  const showRangeHighlight = granularity !== "month" && granularity !== "year";

  return (
    <React.Fragment>
      <div
        className={cn(
          "mini-calendar__week-number cursor-pointer py-1.5 text-xs flex items-center justify-center border rounded-[6px] transition-colors",
          "hover:bg-[color-mix(in_srgb,var(--color-accent),transparent_75%)]",
          isWeekSelected
            ? "text-[var(--color-accent)] border-[var(--color-accent)]"
            : "text-[var(--text-muted)] border-transparent"
        )}
        onClick={() => onSelectWeek(week[0])}
      >
        {week[0].isoWeek()}
      </div>

      {week.map((day) => (
        <DayCell
          key={day.format("YYYY-MM-DD")}
          day={day}
          isSelectedDay={day.isSame(date, "day")}
          isInSelectedRange={day.isBetween(rangeStart, rangeEnd, "day", "[]")}
          isCurrentMonth={day.isSame(viewDate, "month")}
          hasPost={activityDates.has(day.format("YYYY-MM-DD"))}
          showRangeHighlight={showRangeHighlight}
          onClick={onSelectDay} />
      ))}
    </React.Fragment>
  );
};
