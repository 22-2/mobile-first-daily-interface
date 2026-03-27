import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/shallow";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPeriodicNoteDate, listPeriodicNotes } from "src/core/note-source";
import type { Week } from "src/ui/components/calendar/types";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { useSettingsStore } from "src/ui/store/settingsStore";

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
      rangeStart: date
        .clone()
        .startOf(granularity as moment.unitOfTime.StartOf),
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
      rangeStart: date
        .clone()
        .subtract(days - 1, "days")
        .startOf("day"),
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
export function useMiniCalendar() {
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

  const dbService = useMFDIDB();
  const { data: dbActiveDates = new Set<string>() } = useQuery({
    queryKey: ["activeDates"],
    queryFn: async () => {
      const dates = await dbService.getAllActiveDates();
      return new Set(dates);
    },
    staleTime: Infinity,
  });

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
