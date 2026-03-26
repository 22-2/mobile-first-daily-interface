import { Box, HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { resolvePeriodicNote } from "src/core/note-source";
import {
  SidebarItemCount,
  SidebarTextButton,
} from "src/ui/components/layout/SidebarPrimitives";
import { useAppContext } from "src/ui/context/AppContext";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { parseThinoEntries } from "src/utils/thino";
import { useShallow } from "zustand/shallow";

interface Counts {
  posts: number;
  tasks: number;
}

export const SidebarScales: React.FC<{ viewedDate?: moment.Moment }> = ({
  viewedDate,
}) => {
  const { shell } = useAppContext();
  const {
    date,
    setDate,
    setGranularity,
    setDateFilter,
    granularity,
    activeTopic,
    handleClickHome,
  } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      setDate: s.setDate,
      setGranularity: s.setGranularity,
      setDateFilter: s.setDateFilter,
      granularity: s.granularity,
      activeTopic: s.activeTopic,
      handleClickHome: s.handleClickHome,
    })),
  );

  const baseDate = viewedDate || date;
  const monthStart = baseDate.clone().startOf("month");
  const monthEnd = baseDate.clone().endOf("month");

  // 当月の週（月曜始まり）をすべてリストアップ
  const weeks: moment.Moment[] = [];
  const cursor = monthStart.clone().startOf("isoWeek");
  while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, "day")) {
    weeks.push(cursor.clone());
    cursor.add(1, "week");
  }

  const [countsMap, setCountsMap] = useState<Record<string, Counts>>({});
  const [loading, setLoading] = useState(false);

  const [filter, setFilter] = useState<"all" | "year" | "month" | "week">(
    "all",
  );

  // 指定した期間の投稿数とタスク数を取得する関数
  const getCountsForPeriod = useCallback(
    async (d: moment.Moment, g: "week" | "month" | "year") => {
      const note = resolvePeriodicNote(shell, d, g, activeTopic);
      if (!note) return { posts: 0, tasks: 0 };

      const content = await shell.cachedReadFile(note);
      const posts = parseThinoEntries(content).length;
      const tasks = (await shell.getTasks(note))?.length || 0;
      return { posts, tasks };
    },
    [shell, activeTopic],
  );

  useEffect(() => {
    let isMounted = true;
    const fetchAllCounts = async () => {
      setLoading(true);
      const newCounts: Record<string, Counts> = {};

      // 月と年のカウント
      const [mCounts, yCounts] = await Promise.all([
        getCountsForPeriod(baseDate, "month"),
        getCountsForPeriod(baseDate, "year"),
      ]);
      newCounts[`month-${baseDate.format("YYYY-MM")}`] = mCounts;
      newCounts[`year-${baseDate.format("YYYY")}`] = yCounts;

      const wPromises = weeks.map(async (w) => {
        const c = await getCountsForPeriod(w, "week");
        return { key: `week-${w.format("YYYY-WW")}`, counts: c };
      });
      const wResults = await Promise.all(wPromises);
      wResults.forEach((r) => {
        newCounts[r.key] = r.counts;
      });

      if (isMounted) {
        setCountsMap(newCounts);
        setLoading(false);
      }
    };

    fetchAllCounts();
    return () => {
      isMounted = false;
    };
  }, [baseDate, activeTopic, getCountsForPeriod]);

  const renderCountBadge = (counts?: Counts) => {
    if (!counts || (counts.posts === 0 && counts.tasks === 0)) return null;
    return (
      <SidebarItemCount>
        ({counts.posts}p / {counts.tasks}t)
      </SidebarItemCount>
    );
  };

  const FilterButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
  }> = ({ label, isActive, onClick }) => (
    <Text
      fontSize="var(--font-ui-small)"
      fontWeight={isActive ? "bold" : "normal"}
      color={isActive ? "var(--color-accent)" : "var(--text-muted)"}
      cursor="pointer"
      transition="color 0.1s ease"
      _hover={{ color: "var(--text-normal)" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {label}
    </Text>
  );

  const Separator = () => (
    <Box
      as="span"
      mx={2}
      h="10px"
      w="1px"
      bg="var(--background-modifier-border)"
      display="inline-block"
    />
  );

  return (
    <VStack
      align="stretch"
      spacing={0}
      pt={2}
      mt={2}
      className="mfdi-sidebar-scales"
    >
      <HStack spacing={0} px={2} mb={2} justify="space-between" align="center">
        <HStack spacing={6} align="center">
          <FilterButton
            label="すべて"
            isActive={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <Separator />
          <FilterButton
            label="年"
            isActive={filter === "year"}
            onClick={() => setFilter("year")}
          />
          <Separator />
          <FilterButton
            label="月"
            isActive={filter === "month"}
            onClick={() => setFilter("month")}
          />
          <Separator />
          <FilterButton
            label="週"
            isActive={filter === "week"}
            onClick={() => setFilter("week")}
          />
        </HStack>
        {loading && (
          <Spinner size="xs" color="var(--text-faint)" speed="0.8s" />
        )}
      </HStack>

      <VStack align="stretch" spacing={0} className="mfdi-scale-list-unified">
        {(filter === "all" || filter === "year") &&
          (() => {
            const yKey = `year-${baseDate.format("YYYY")}`;
            const yCounts = countsMap[yKey];
            const yHasActivity =
              yCounts && (yCounts.posts > 0 || yCounts.tasks > 0);
            const isSelected = granularity === "year";

            return (
              <SidebarTextButton
                isSelected={isSelected}
                isMuted={!yHasActivity}
                className={`mfdi-scale-item mfdi-scale-item-year ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  // メンタルモデル: タグのON/OFFトグルのように、
                  // すでに選択されている期間（年）を再度クリックした場合は
                  // ホーム状態（デフォルトの日ビューなど）にリセットする
                  if (isSelected) {
                    handleClickHome();
                  } else {
                    setGranularity("year");
                    setDateFilter("today");
                    setDate(baseDate.clone());
                  }
                }}
              >
                <HStack spacing={0} justify="space-between" w="100%">
                  <Text as="span">{baseDate.format("YYYY")}</Text>
                  {renderCountBadge(yCounts)}
                </HStack>
              </SidebarTextButton>
            );
          })()}

        {(filter === "all" || filter === "month") &&
          (() => {
            const mKey = `month-${baseDate.format("YYYY-MM")}`;
            const mCounts = countsMap[mKey];
            const mHasActivity =
              mCounts && (mCounts.posts > 0 || mCounts.tasks > 0);
            const isSelected = granularity === "month";

            return (
              <SidebarTextButton
                isSelected={isSelected}
                isMuted={!mHasActivity}
                className={`mfdi-scale-item mfdi-scale-item-month ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  // メンタルモデル: タグのON/OFFトグルのように、
                  // すでに選択されている期間（月）を再度クリックした場合は
                  // ホーム状態（デフォルトの日ビューなど）にリセットする
                  if (isSelected) {
                    handleClickHome();
                  } else {
                    setGranularity("month");
                    setDateFilter("today");
                    setDate(baseDate.clone());
                  }
                }}
              >
                <HStack spacing={0} justify="space-between" w="100%">
                  <Text as="span">{baseDate.format("YYYY-MM")}</Text>
                  {renderCountBadge(mCounts)}
                </HStack>
              </SidebarTextButton>
            );
          })()}

        {(filter === "all" || filter === "week") &&
          weeks.map((w) => {
            const isSelected =
              granularity === "week" && date.isSame(w, "isoWeek");
            const counts = countsMap[`week-${w.format("YYYY-WW")}`];
            const hasActivity =
              counts && (counts.posts > 0 || counts.tasks > 0);

            return (
              <SidebarTextButton
                key={w.format("YYYY-WW")}
                isSelected={isSelected}
                isMuted={!hasActivity}
                className={`mfdi-scale-item mfdi-scale-item-week ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  // メンタルモデル: タグのON/OFFトグルのように、
                  // すでに選択されている期間（週）を再度クリックした場合は
                  // ホーム状態（デフォルトの日ビューなど）にリセットする
                  if (isSelected) {
                    handleClickHome();
                  } else {
                    setGranularity("week");
                    setDateFilter("today");
                    const targetDay = w.isBefore(monthStart)
                      ? monthStart.clone()
                      : w.clone();
                    setDate(targetDay);
                  }
                }}
              >
                <HStack spacing={0} justify="space-between" w="100%">
                  <Text as="span">W{w.isoWeek()}</Text>
                  {renderCountBadge(counts)}
                </HStack>
              </SidebarTextButton>
            );
          })}
      </VStack>
    </VStack>
  );
};
