import { HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { resolvePeriodicNote } from "src/core/note-source";
import {
  SidebarSectionHeader,
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
  } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      setDate: s.setDate,
      setGranularity: s.setGranularity,
      setDateFilter: s.setDateFilter,
      granularity: s.granularity,
      activeTopic: s.activeTopic,
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

      // 週のカウント（日スケールで解析が必要な場合は少し複雑だが、ここでは週ノートが存在すると仮定、または将来的に集計ロジックを入れる余地として）
      // 現状は週ノート(g="week")から取得
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
      <Text
        fontSize="10px"
        color="var(--text-muted)"
        fontWeight="normal"
        ml={1}
        display="inline"
      >
        ({counts.posts}p / {counts.tasks}t)
      </Text>
    );
  };

  return (
    <VStack
      align="stretch"
      spacing={4}
      p={2}
      mt={2}
      className="mfdi-sidebar-scales"
    >
      <VStack
        align="stretch"
        spacing={1}
        className="mfdi-scale-section mfdi-scale-section-week"
      >
        <SidebarSectionHeader
          className="mfdi-scale-label"
          rightAddon={
            loading ? (
              <Spinner size="xs" color="var(--text-faint)" speed="0.8s" />
            ) : null
          }
        >
          週
        </SidebarSectionHeader>
        <VStack
          align="stretch"
          spacing={0}
          className="mfdi-scale-list mfdi-scale-list-week"
        >
          {weeks.map((w) => {
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
                  setGranularity("week");
                  setDateFilter("today");
                  // カレンダーの月表示が変わらないよう、その週の中で「今表示している月」に含まれる日を選択する
                  const targetDay = w.isBefore(monthStart)
                    ? monthStart.clone()
                    : w.clone();
                  setDate(targetDay);
                }}
              >
                <HStack spacing={0} justify="space-between">
                  <Text as="span">W{w.isoWeek()}</Text>
                  {renderCountBadge(counts)}
                </HStack>
              </SidebarTextButton>
            );
          })}
        </VStack>
      </VStack>

      <VStack
        align="stretch"
        spacing={1}
        pt={2}
        className="mfdi-scale-section mfdi-scale-section-month-year"
      >
        <SidebarSectionHeader className="mfdi-scale-label">
          月 / 年
        </SidebarSectionHeader>
        <VStack
          align="stretch"
          spacing={0}
          className="mfdi-scale-list mfdi-scale-list-month-year"
        >
          {(() => {
            const mKey = `month-${baseDate.format("YYYY-MM")}`;
            const mCounts = countsMap[mKey];
            const mHasActivity =
              mCounts && (mCounts.posts > 0 || mCounts.tasks > 0);
            const isMonthSelected = granularity === "month";

            return (
              <SidebarTextButton
                isSelected={isMonthSelected}
                isMuted={!mHasActivity}
                className={`mfdi-scale-item mfdi-scale-item-month ${isMonthSelected ? "is-selected" : ""}`}
                onClick={() => {
                  setGranularity("month");
                  setDateFilter("today");
                  setDate(baseDate.clone());
                }}
              >
                <HStack spacing={0} justify="space-between">
                  <Text as="span">{baseDate.format("YYYY-MM")}</Text>
                  {renderCountBadge(mCounts)}
                </HStack>
              </SidebarTextButton>
            );
          })()}
          {(() => {
            const yKey = `year-${baseDate.format("YYYY")}`;
            const yCounts = countsMap[yKey];
            const yHasActivity =
              yCounts && (yCounts.posts > 0 || yCounts.tasks > 0);
            const isYearSelected = granularity === "year";

            return (
              <SidebarTextButton
                isSelected={isYearSelected}
                isMuted={!yHasActivity}
                className={`mfdi-scale-item mfdi-scale-item-year ${isYearSelected ? "is-selected" : ""}`}
                onClick={() => {
                  setGranularity("year");
                  setDateFilter("today");
                  setDate(baseDate.clone());
                }}
              >
                <HStack spacing={0} justify="space-between">
                  <Text as="span">{baseDate.format("YYYY")}</Text>
                  {renderCountBadge(yCounts)}
                </HStack>
              </SidebarTextButton>
            );
          })()}
        </VStack>
      </VStack>
    </VStack>
  );
};
