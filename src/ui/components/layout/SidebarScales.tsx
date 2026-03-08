import { Box, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import * as React from "react";
import { useMFDIContext } from "../../context/MFDIAppContext";

export const SidebarScales: React.FC<{ viewedDate?: moment.Moment }> = ({
  viewedDate,
}) => {
  const { date, setDate, setGranularity, setDateFilter, granularity, dateFilter } =
    useMFDIContext();

  const baseDate = viewedDate || date;
  const monthStart = baseDate.clone().startOf("month");
  const monthEnd = baseDate.clone().endOf("month");

  // 当月の週（月曜始まり）をすべてリストアップ
  const weeks: moment.Moment[] = [];
  const cursor = monthStart.clone().startOf("isoWeek");
  // 月の終点まで、各週の開始日を追加
  while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, "day")) {
    weeks.push(cursor.clone());
    cursor.add(1, "week");
  }

  const activeBg = "var(--color-accent)";
  const activeColor = "var(--text-on-accent)";
  const inactiveBg = "var(--background-modifier-border)";
  const inactiveColor = "var(--text-normal)";
  const hoverBg = "var(--background-modifier-hover)";

  return (
    <VStack
      align="stretch"
      spacing={3}
      p={4}
      mt={4}
      borderRadius="22px"
      bg="var(--background-secondary)"
      border="1px solid var(--table-border-color)"
      className="mfdi-sidebar-scales"
    >
      <VStack align="stretch" spacing={2} className="mfdi-scale-section mfdi-scale-section-week">
        <Text fontSize="xs" fontWeight="bold" color="var(--text-muted)" className="mfdi-scale-label">
          週スケール ({baseDate.format("M月")})
        </Text>
        <Flex wrap="wrap" gap={2} className="mfdi-scale-list mfdi-scale-list-week">
          {weeks.map((w) => {
            const isSelected =
              granularity === "day" &&
              dateFilter === "this_week" &&
              date.isSame(w, "isoWeek");
            return (
              <Box
                key={w.format("YYYY-WW")}
                px={3}
                py={1.5}
                borderRadius="8px"
                bg={isSelected ? activeBg : inactiveBg}
                color={isSelected ? activeColor : inactiveColor}
                cursor="pointer"
                fontSize="xs"
                fontWeight="bold"
                transition="all 0.2s"
                _hover={{
                  bg: isSelected ? "var(--color-accent-2)" : hoverBg,
                }}
                className={`mfdi-scale-item mfdi-scale-item-week ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  setGranularity("day");
                  setDateFilter("this_week");
                  setDate(w.clone());
                }}
              >
                W{w.isoWeek()}
              </Box>
            );
          })}
        </Flex>
      </VStack>

      <VStack align="stretch" spacing={2} pt={2} className="mfdi-scale-section mfdi-scale-section-month-year">
        <Text fontSize="xs" fontWeight="bold" color="var(--text-muted)" className="mfdi-scale-label">
          月・年スケール
        </Text>
        <HStack spacing={2} className="mfdi-scale-list mfdi-scale-list-month-year">
          <Box
            flex="1"
            textAlign="center"
            px={3}
            py={1.5}
            borderRadius="8px"
            bg={granularity === "month" ? activeBg : inactiveBg}
            color={granularity === "month" ? activeColor : inactiveColor}
            cursor="pointer"
            fontSize="xs"
            fontWeight="bold"
            transition="all 0.2s"
            _hover={{
              bg: granularity === "month" ? "var(--color-accent-2)" : hoverBg,
            }}
            className={`mfdi-scale-item mfdi-scale-item-month ${granularity === "month" ? "is-selected" : ""}`}
            onClick={() => {
              setGranularity("month");
              setDate(baseDate.clone().startOf("month"));
            }}
          >
            {baseDate.format("YYYY-MM")}
          </Box>
          <Box
            flex="1"
            textAlign="center"
            px={3}
            py={1.5}
            borderRadius="8px"
            bg={granularity === "year" ? activeBg : inactiveBg}
            color={granularity === "year" ? activeColor : inactiveColor}
            cursor="pointer"
            fontSize="xs"
            fontWeight="bold"
            transition="all 0.2s"
            _hover={{
              bg: granularity === "year" ? "var(--color-accent-2)" : hoverBg,
            }}
            className={`mfdi-scale-item mfdi-scale-item-year ${granularity === "year" ? "is-selected" : ""}`}
            onClick={() => {
              setGranularity("year");
              setDate(baseDate.clone().startOf("year"));
            }}
          >
            {baseDate.format("YYYY")}
          </Box>
        </HStack>
      </VStack>
    </VStack>
  );
};
