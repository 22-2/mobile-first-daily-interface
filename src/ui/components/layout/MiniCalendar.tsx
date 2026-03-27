import { useLiveQuery } from "dexie-react-hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getPeriodicNoteDate, listPeriodicNotes } from "src/core/note-source";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";
import { cn } from "src/ui/components/primitives/utils";

const WEEK_DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

type Week = moment.Moment[];

interface DayCellProps {
  day: moment.Moment;
  isSelectedDay: boolean;
  isInSelectedRange: boolean;
  isCurrentMonth: boolean;
  hasPost: boolean;
  onClick: (day: moment.Moment) => void;
}

interface WeekRowProps {
  week: Week;
  weekIndex: number;
  date: moment.Moment;
  granularity: string;
  rangeStart: moment.Moment;
  rangeEnd: moment.Moment;
  viewDate: moment.Moment;
  dateFilter: string;
  activityDates: Set<string>;
  onSelectDay: (day: moment.Moment) => void;
  onSelectWeek: (weekStart: moment.Moment) => void;
}

// ─────────────────────────────────────────────
// 純粋な計算関数 (変更なし)
// ─────────────────────────────────────────────

function buildWeeksInMonth(viewDate: moment.Moment): Week[] {
  const startDay = viewDate.clone().startOf("month").startOf("isoWeek");
  const endDay = viewDate.clone().endOf("month").endOf("isoWeek");
  const days: moment.Moment[] = [];

  const cursor = startDay.clone();
  while (cursor.isSameOrBefore(endDay, "day")) {
    days.push(cursor.clone());
    cursor.add(1, "day");
  }

  const weeks: Week[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function calcSelectedRange(
  date: moment.Moment,
  granularity: string,
  dateFilter: string,
): { rangeStart: moment.Moment; rangeEnd: moment.Moment } {
  if (granularity === "week") {
    return {
      rangeStart: date.clone().startOf("isoWeek"),
      rangeEnd: date.clone().endOf("isoWeek"),
    };
  }
  if (granularity !== "day" || dateFilter === "today") {
    return {
      rangeStart: date.clone().startOf(granularity as moment.unitOfTime.StartOf),
      rangeEnd: date.clone().endOf(granularity as moment.unitOfTime.StartOf),
    };
  }
  if (dateFilter === "this_week") {
    return {
      rangeStart: date.clone().startOf("isoWeek"),
      rangeEnd: date.clone().endOf("isoWeek"),
    };
  }
  const days = parseInt(dateFilter, 10);
  if (!isNaN(days)) {
    return {
      rangeStart: date.clone().subtract(days - 1, "days").startOf("day"),
      rangeEnd: date.clone().endOf("day"),
    };
  }
  return {
    rangeStart: date.clone().startOf("day"),
    rangeEnd: date.clone().endOf("day"),
  };
}

// ─────────────────────────────────────────────
// カスタムフック (変更なし)
// ─────────────────────────────────────────────

function useMiniCalendar() {
  const { shell } = useAppContext();
  const {
    date,
    setDate,
    granularity,
    setGranularity,
    dateFilter,
    setDateFilter,
    setDisplayMode,
    activeTopic,
  } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      setDate: s.setDate,
      granularity: s.granularity,
      setGranularity: s.setGranularity,
      dateFilter: s.dateFilter,
      setDateFilter: s.setDateFilter,
      setDisplayMode: s.setDisplayMode,
      activeTopic: s.activeTopic,
    })),
  );

  const db = useMFDIDB();
  const dbActiveDates = useLiveQuery(
    async () => {
      if (!db) return new Set<string>();
      const dates = await db.getAllActiveDates();
      return new Set(dates);
    },
    [db],
    new Set<string>(),
  );

  const [viewDate, setViewDate] = useState(() =>
    window.moment(date).startOf("month"),
  );

  const prevDateRef = useRef(date);
  const skipNextViewUpdate = useRef(false);

  useEffect(() => {
    if (skipNextViewUpdate.current) {
      skipNextViewUpdate.current = false;
      prevDateRef.current = date;
      return;
    }
    if (!date.isSame(prevDateRef.current, "month")) {
      setViewDate(window.moment(date).startOf("month"));
    }
    prevDateRef.current = date;
  }, [date]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => prev.clone().subtract(1, "month"));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => prev.clone().add(1, "month"));
  };

  const handleSelectDay = (day: moment.Moment) => {
    if (!day.isSame(viewDate, "month")) {
      skipNextViewUpdate.current = true;
    }
    setDisplayMode(DISPLAY_MODE.FOCUS);
    setGranularity("day");
    setDateFilter("today");
    setDate(day.clone());
  };

  const handleSelectWeek = (weekStart: moment.Moment) => {
    if (!weekStart.isSame(viewDate, "month")) {
      skipNextViewUpdate.current = true;
    }
    setDisplayMode(DISPLAY_MODE.FOCUS);
    setGranularity("day");
    setDateFilter("this_week");
    setDate(weekStart.clone());
  };

  const activityDates = useMemo(() => {
    const notes = listPeriodicNotes(shell, "day", activeTopic);
    const dates = new Set<string>(dbActiveDates);
    Object.values(notes).forEach((file) => {
      const d = getPeriodicNoteDate(file, "day", shell, activeTopic);
      if (d) dates.add(d.format("YYYY-MM-DD"));
    });
    return dates;
  }, [shell, activeTopic, dbActiveDates]);

  const weeks = useMemo(() => buildWeeksInMonth(viewDate), [viewDate]);
  const { rangeStart, rangeEnd } = calcSelectedRange(
    date,
    granularity,
    dateFilter as string,
  );

  return {
    date,
    granularity,
    viewDate,
    weeks,
    rangeStart,
    rangeEnd,
    dateFilter,
    activityDates,
    handlePrevMonth,
    handleNextMonth,
    handleSelectDay,
    handleSelectWeek,
    setDate,
    setGranularity,
    setDateFilter,
  };
}

// ─────────────────────────────────────────────
// サブコンポーネント (Tailwind化)
// ─────────────────────────────────────────────

const CalendarHeader: React.FC<{
  viewDate: moment.Moment;
  date: moment.Moment;
  granularity: string;
  onPrev: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
}> = ({ viewDate, date, granularity, onPrev, onNext }) => {
  const isSameYear = viewDate.isSame(date, "year");
  const isSameMonth = viewDate.isSame(date, "month");

  const highlightYear =
    (granularity === "year" && isSameYear) ||
    (granularity === "month" && isSameMonth);
  const highlightMonth = granularity === "month" && isSameMonth;

  return (
    <div className="mini-calendar__header flex w-full justify-between items-center px-1">
      <div className="mini-calendar__month-label flex items-center gap-1 ml-[var(--size-4-2)]">
        <span
          className={cn(
            "font-bold text-lg",
            highlightYear ? "text-[var(--color-accent)]" : "text-[var(--text-normal)]"
          )}
        >
          {viewDate.format("YYYY年")}
        </span>
        <span
          className={cn(
            "font-bold text-lg",
            highlightMonth ? "text-[var(--color-accent)]" : "text-[var(--text-normal)]"
          )}
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

const DayCell: React.FC<DayCellProps & { showRangeHighlight: boolean }> = ({
  day,
  isSelectedDay,
  isInSelectedRange,
  isCurrentMonth,
  hasPost,
  showRangeHighlight,
  onClick,
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
          )}
        />
      )}
    </div>
  );
};

const WeekRow: React.FC<WeekRowProps> = ({
  week,
  date,
  granularity,
  rangeStart,
  rangeEnd,
  viewDate,
  dateFilter,
  activityDates,
  onSelectDay,
  onSelectWeek,
}) => {
  const isWeekSelected =
    (granularity === "week" || (granularity === "day" && dateFilter === "this_week")) &&
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
          onClick={onSelectDay}
        />
      ))}
    </React.Fragment>
  );
};

// ─────────────────────────────────────────────
// メインコンポーネント (Tailwind化)
// ─────────────────────────────────────────────

export const MiniCalendar: React.FC<{
  onViewDateChange?: (date: moment.Moment) => void;
}> = ({ onViewDateChange }) => {
  const {
    date,
    granularity,
    viewDate,
    weeks,
    rangeStart,
    rangeEnd,
    dateFilter,
    activityDates,
    handlePrevMonth,
    handleNextMonth,
    handleSelectDay,
    handleSelectWeek,
  } = useMiniCalendar();

  useEffect(() => {
    onViewDateChange?.(viewDate);
  }, [viewDate, onViewDateChange]);

  return (
    <div
      className="mini-calendar flex flex-col w-full gap-4 p-4 rounded-[22px] bg-[var(--background-secondary)] border border-[var(--table-border-color)]"
    >
      <CalendarHeader
        viewDate={viewDate}
        date={date}
        granularity={granularity}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
      />

      <div
        className="mini-calendar__grid grid grid-cols-8 gap-1 w-full text-center text-sm"
      >
        {/* 曜日ヘッダー */}
        <div /> {/* 週番号列のスペーサー */}
        {WEEK_DAY_LABELS.map((label) => (
          <div
            key={label}
            className="mini-calendar__weekday-label text-[var(--text-muted)] text-xs py-1.5"
          >
            {label}
          </div>
        ))}
        {/* 週ごとの行 */}
        {weeks.map((week, wIdx) => (
          <WeekRow
            key={wIdx}
            week={week}
            weekIndex={wIdx}
            date={date}
            granularity={granularity}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            viewDate={viewDate}
            dateFilter={dateFilter as string}
            activityDates={activityDates}
            onSelectDay={handleSelectDay}
            onSelectWeek={handleSelectWeek}
          />
        ))}
      </div>
    </div>
  );
};
