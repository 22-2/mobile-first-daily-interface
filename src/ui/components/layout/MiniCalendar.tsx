import { Box, Flex, Grid, HStack, Text, VStack } from "@chakra-ui/react";
import * as React from "react";
import { useMFDIContext } from "../../context/MFDIAppContext";
import { ObsidianIcon } from "../common/ObsidianIcon";

export const MiniCalendar: React.FC = () => {
  const { date, setDate, granularity, dateFilter, posts } = useMFDIContext();

  const [viewDate, setViewDate] = React.useState(window.moment(date).startOf("month"));
  const viewDateRef = React.useRef(viewDate);
  const prevDateRef = React.useRef(date);

  // 外部からのdate変更時のみ、カレンダーの表示月を追従させる
  React.useEffect(() => {
    if (!date.isSame(prevDateRef.current, "month")) {
      const newViewDate = window.moment(date).startOf("month");
      setViewDate(newViewDate);
      viewDateRef.current = newViewDate;
    }
    prevDateRef.current = date;
  }, [date]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDate = viewDate.clone().subtract(1, "month");
    setViewDate(newDate);
    viewDateRef.current = newDate;
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDate = viewDate.clone().add(1, "month");
    setViewDate(newDate);
    viewDateRef.current = newDate;
  };

  const handleSelectDay = (day: moment.Moment) => {
    setDate(day.clone());
  };

  const handleSelectWeek = (weekStart: moment.Moment) => {
    setDate(weekStart.clone());
  };

  const daysInMonth = [];
  const startDay = viewDate.clone().startOf("month").startOf("isoWeek"); // 月曜日始まり
  const endDay = viewDate.clone().endOf("month").endOf("isoWeek"); // 日曜日終わり

  const currentDay = startDay.clone();
  while (currentDay.isBefore(endDay) || currentDay.isSame(endDay, "day")) {
    daysInMonth.push(currentDay.clone());
    currentDay.add(1, "day");
  }

  const weeks = [];
  for (let i = 0; i < daysInMonth.length; i += 7) {
    weeks.push(daysInMonth.slice(i, i + 7));
  }
  
  const today = window.moment();

  // 計算された範囲
  let rangeStart = date.clone().startOf(granularity);
  let rangeEnd = date.clone().endOf(granularity);

  if (granularity === "day" && dateFilter !== "today") {
    if (dateFilter === "this_week") {
      rangeStart = date.clone().startOf("isoWeek");
      rangeEnd = date.clone().endOf("isoWeek");
    } else {
      const days = parseInt(dateFilter as string);
      if (!isNaN(days)) {
        rangeStart = date.clone().subtract(days - 1, "days").startOf("day");
        rangeEnd = date.clone().endOf("day");
      }
    }
  }

  const postDates = React.useMemo(() => {
    const dates = new Set<string>();
    for (const post of posts || []) {
      if (post.timestamp) {
        dates.add(post.timestamp.format("YYYY-MM-DD"));
      }
    }
    return dates;
  }, [posts]);

  return (
    <VStack 
      w="100%" 
      spacing={4} 
      p={4} 
      borderRadius="22px" 
      bg="var(--background-secondary)"
      border="1px solid var(--table-border-color)" 
    >
      {/* カレンダーヘッダー：年月と矢印 */}
      <Flex w="100%" justify="space-between" align="center" px={1}>
        <Text fontWeight="bold" fontSize="lg" color="var(--text-normal)" marginLeft="var(--size-4-2)">
          {viewDate.format("YYYY年 M月")}
        </Text>
        <HStack spacing={1}>
          <Box cursor="pointer" onClick={handlePrevMonth} p={1.5} borderRadius="4px" _hover={{ bg: "var(--background-modifier-hover)" }} color="var(--text-muted)">
            <ObsidianIcon name="chevron-left" size="1.2em" />
          </Box>
          <Box cursor="pointer" onClick={handleNextMonth} p={1.5} borderRadius="4px" _hover={{ bg: "var(--background-modifier-hover)" }} color="var(--text-muted)">
            <ObsidianIcon name="chevron-right" size="1.2em" />
          </Box>
        </HStack>
      </Flex>

      {/* カレンダー本体 */}
      <Grid templateColumns="repeat(8, 1fr)" gap={1} w="100%" textAlign="center" fontSize="sm">
        {/* 曜日ヘッダー */}
        <Box /> {/* 週番号用の空箱 */}
        {["月", "火", "水", "木", "金", "土", "日"].map(d => (
          <Box key={d} color="var(--text-muted)" fontSize="xs" py={1.5}>{d}</Box>
        ))}

        {/* 日付 */}
        {weeks.map((week, wIdx) => {
          const isWeekSelected = granularity === "week" && week[0].isSame(date, "isoWeek");
          
          return (
            <React.Fragment key={wIdx}>
              {/* 週番号（左端） */}
              <Box
                cursor="pointer"
                onClick={() => handleSelectWeek(week[0])}
                py={1.5}
                color={isWeekSelected ? "var(--color-accent)" : "var(--text-muted)"}
                fontSize="xs"
                display="flex"
                alignItems="center"
                justifyContent="center"
                border={isWeekSelected ? "1px solid var(--color-accent)" : "1px solid transparent"}
                borderRadius="6px"
                _hover={{ bg: "var(--background-modifier-hover)" }}
              >
                {week[0].isoWeek()}
              </Box>

              {/* その週の各日 */}
              {week.map(day => {
                const isSelectedDay = day.isSame(date, "day");
                const isInSelectedRange = day.isBetween(rangeStart, rangeEnd, "day", "[]");
                
                const isCurrentMonth = day.isSame(viewDate, "month");
                const isForeground = isCurrentMonth || isSelectedDay || isInSelectedRange;
                const hasPost = postDates.has(day.format("YYYY-MM-DD"));
                
                let bg = "transparent";
                let color = isForeground ? "var(--text-normal)" : "var(--text-faint)";
                let fontWeight = "normal";

                if (isSelectedDay) {
                  bg = "var(--color-accent)!important";
                  color = "var(--text-on-accent)";
                  fontWeight = "bold";
                } else if (isInSelectedRange) {
                  // 少し薄いアクセントカラーにする
                  bg = "var(--background-modifier-active-hover)";
                  color = "var(--color-accent)";
                  fontWeight = "bold";
                }

                return (
                  <Box
                    key={day.format("YYYY-MM-DD")}
                    cursor="pointer"
                    onClick={() => handleSelectDay(day)}
                    py={1.5}
                    position="relative"
                    color={color}
                    bg={bg}
                    borderRadius="full"
                    fontWeight={fontWeight}
                    _hover={{ 
                        bg: isSelectedDay ? "var(--color-accent-2)" : "var(--background-modifier-hover)" 
                    }}
                    transition="all 0.1s ease-in-out"
                  >
                    {day.date()}
                    {hasPost && (
                      <Box
                        position="absolute"
                        bottom="2px"
                        left="50%"
                        transform="translateX(-50%)"
                        w="4px"
                        h="4px"
                        borderRadius="full"
                        bg={isSelectedDay ? "var(--text-on-accent)" : isInSelectedRange ? "var(--color-accent)" : "var(--text-muted)"}
                      />
                    )}
                  </Box>
                )
              })}
            </React.Fragment>
          );
        })}
      </Grid>
    </VStack>
  );
};
