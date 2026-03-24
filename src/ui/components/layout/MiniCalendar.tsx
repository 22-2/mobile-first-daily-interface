import { Box, Flex, Grid, HStack, Text, VStack } from "@chakra-ui/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { getAllTopicNotes } from "src/utils/daily-notes/notes";
import { getDateFromFile } from "src/utils/daily-notes/utils";
import { useShallow } from "zustand/shallow";

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
// 純粋な計算関数
// ─────────────────────────────────────────────

/** 月の全週（月曜始まり・日曜終わり）を返す */
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

/** dateFilter に応じた選択範囲を返す */
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
// カスタムフック
// ─────────────────────────────────────────────

function useMiniCalendar() {
  const { app } = useAppContext();
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

  const { posts } = usePostsStore(
    useShallow((s) => ({
      posts: s.posts,
    })),
  );

  const [viewDate, setViewDate] = useState(() =>
    window.moment(date).startOf("month"),
  );

  const prevDateRef = useRef(date);
  const skipNextViewUpdate = useRef(false);

  // 外部からの date 変更時のみ表示月を追従
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
    setDateFilter("today"); // 1日表示に戻す
    setDate(day.clone());
  };

  const handleSelectWeek = (weekStart: moment.Moment) => {
    if (!weekStart.isSame(viewDate, "month")) {
      skipNextViewUpdate.current = true;
    }
    setDisplayMode(DISPLAY_MODE.FOCUS);
    // 週スケール（週ノート）に切り替える（SidebarScales とは挙動を分離）
    setGranularity("day");
    setDateFilter("this_week");
    setDate(weekStart.clone());
  };

  const activityDates = useMemo(() => {
    const notes = getAllTopicNotes(app, "day", activeTopic);
    const dates = new Set<string>();

    Object.values(notes).forEach((file) => {
      const d = getDateFromFile(file, "day", activeTopic);
      if (d) dates.add(d.format("YYYY-MM-DD"));
    });

    for (const post of posts ?? []) {
      if (post.timestamp) {
        dates.add(post.timestamp.format("YYYY-MM-DD"));
      }
    }
    return dates;
  }, [app, activeTopic, posts]);

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
// サブコンポーネント
// ─────────────────────────────────────────────

const CalendarHeader: React.FC<{
  viewDate: moment.Moment;
  onPrev: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
}> = ({ viewDate, onPrev, onNext }) => (
  <Flex
    className="mini-calendar__header"
    w="100%"
    justify="space-between"
    align="center"
    px={1}
  >
    <Text
      className="mini-calendar__month-label"
      fontWeight="bold"
      fontSize="lg"
      color="var(--text-normal)"
      marginLeft="var(--size-4-2)"
    >
      {viewDate.format("YYYY年 M月")}
    </Text>
    <HStack className="mini-calendar__nav" spacing={1}>
      {(["chevron-left", "chevron-right"] as const).map((icon, i) => (
        <Box
          className="mini-calendar__nav-button"
          key={icon}
          onClick={i === 0 ? onPrev : onNext}
          p={1.5}
          borderRadius="4px"
          _hover={{ bg: "var(--background-modifier-hover)" }}
        >
          <ObsidianIcon name={icon} size="1.2em" />
        </Box>
      ))}
    </HStack>
  </Flex>
);

const DayCell: React.FC<DayCellProps> = ({
  day,
  isSelectedDay,
  isInSelectedRange,
  isCurrentMonth,
  hasPost,
  onClick,
}) => {
  const isToday = day.isSame(window.moment(), "day");
  const isForeground =
    isCurrentMonth || isSelectedDay || isInSelectedRange || isToday;

  // 青背景（アクセントカラー）は「今日」のみに適用
  // 背景色の決定：今日 > 選択範囲・ホバー
  // 視認性を高めるため、アクセントカラーを薄く混ぜた色を使用
  const rangeBg = "color-mix(in srgb, var(--color-accent), transparent 85%)";
  const hoverBg = "color-mix(in srgb, var(--color-accent), transparent 75%)";

  const bg = isToday
    ? "var(--color-accent)!important"
    : isInSelectedRange
      ? rangeBg
      : "transparent";

  const color = isToday
    ? "var(--text-on-accent)"
    : isInSelectedRange
      ? "var(--color-accent)"
      : isForeground
        ? "var(--text-normal)"
        : "var(--text-faint)";

  const fontWeight = isToday || isInSelectedRange ? "bold" : "normal";

  const dotColor = isToday
    ? "var(--text-on-accent)"
    : isInSelectedRange
      ? "var(--color-accent)"
      : "var(--text-muted)";

  return (
    <Box
      className="mini-calendar__day-cell"
      cursor="pointer"
      onClick={() => onClick(day)}
      py={1.5}
      position="relative"
      color={color}
      bg={bg}
      borderRadius="full"
      fontWeight={fontWeight}
      _hover={{
        bg: isToday ? "var(--color-accent-2)" : hoverBg,
      }}
      transition="all 0.1s ease-in-out"
    >
      {day.date()}
      {hasPost && (
        <Box
          className="mini-calendar__dot"
          position="absolute"
          bottom="2px"
          left="50%"
          transform="translateX(-50%)"
          w="4px"
          h="4px"
          borderRadius="full"
          bg={dotColor}
        />
      )}
    </Box>
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
    (granularity === "week" ||
      (granularity === "day" && dateFilter === "this_week")) &&
    week[0].isSame(date, "isoWeek");

  return (
    <React.Fragment>
      {/* 週番号 */}
      <Box
        className="mini-calendar__week-number"
        cursor="pointer"
        onClick={() => onSelectWeek(week[0])}
        py={1.5}
        color={isWeekSelected ? "var(--color-accent)" : "var(--text-muted)"}
        fontSize="xs"
        display="flex"
        alignItems="center"
        justifyContent="center"
        border={`1px solid ${isWeekSelected ? "var(--color-accent)" : "transparent"}`}
        borderRadius="6px"
        _hover={{
          bg: "color-mix(in srgb, var(--color-accent), transparent 75%)",
        }}
      >
        {week[0].isoWeek()}
      </Box>

      {/* 各日 */}
      {week.map((day) => (
        <DayCell
          key={day.format("YYYY-MM-DD")}
          day={day}
          isSelectedDay={day.isSame(date, "day")}
          isInSelectedRange={day.isBetween(rangeStart, rangeEnd, "day", "[]")}
          isCurrentMonth={day.isSame(viewDate, "month")}
          hasPost={activityDates.has(day.format("YYYY-MM-DD"))}
          onClick={onSelectDay}
        />
      ))}
    </React.Fragment>
  );
};

const WEEK_DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;

// ─────────────────────────────────────────────
// メインコンポーネント
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
    <VStack
      className="mini-calendar"
      w="100%"
      spacing={4}
      p={4}
      borderRadius="22px"
      bg="var(--background-secondary)"
      border="1px solid var(--table-border-color)"
    >
      <CalendarHeader
        viewDate={viewDate}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
      />

      <Grid
        className="mini-calendar__grid"
        templateColumns="repeat(8, 1fr)"
        gap={1}
        w="100%"
        textAlign="center"
        fontSize="sm"
      >
        {/* 曜日ヘッダー */}
        <Box /> {/* 週番号列のスペーサー */}
        {WEEK_DAY_LABELS.map((label) => (
          <Box
            key={label}
            className="mini-calendar__weekday-label"
            color="var(--text-muted)"
            fontSize="xs"
            py={1.5}
          >
            {label}
          </Box>
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
      </Grid>
    </VStack>
  );
};
