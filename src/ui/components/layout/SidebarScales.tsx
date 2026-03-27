import { Box, HStack, Spinner, Text, VStack } from "src/ui/components/primitives";
import { useCallback, useEffect, useState } from "react";
import { resolvePeriodicNote } from "src/core/note-source";
import {
  SidebarItemCount,
  SidebarSectionHeader,
  SidebarTextButton,
} from "src/ui/components/layout/SidebarPrimitives";
import { useAppContext } from "src/ui/context/AppContext";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { parseThinoEntries } from "src/core/thino";
import { useShallow } from "zustand/shallow";
import { cn } from "../primitives/utils";

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

  const weeks: moment.Moment[] = [];
  const cursor = monthStart.clone().startOf("isoWeek");
  while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, "day")) {
    weeks.push(cursor.clone());
    cursor.add(1, "week");
  }

  const [countsMap, setCountsMap] = useState<Record<string, Counts>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "year" | "month" | "week">("all");

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
      className={cn(
        "text-[length:var(--font-ui-small)] cursor-pointer transition-colors duration-100 ease-in-out hover:text-[var(--text-normal)]",
        isActive ? "font-bold text-[var(--color-accent)]" : "font-normal text-[var(--text-muted)]",
      )}
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
      className="mx-2 h-[10px] w-px bg-[var(--background-modifier-border)] inline-block"
    />
  );

  return (
    <VStack className="mfdi-sidebar-scales items-stretch gap-0 pt-2 mt-2">
      <SidebarSectionHeader className="sidebar-section-header">
        <HStack className="gap-2 items-center">
          <FilterButton label="すべて" isActive={filter === "all"} onClick={() => setFilter("all")} />
          <Separator />
          <FilterButton label="年" isActive={filter === "year"} onClick={() => setFilter("year")} />
          <Separator />
          <FilterButton label="月" isActive={filter === "month"} onClick={() => setFilter("month")} />
          <Separator />
          <FilterButton label="週" isActive={filter === "week"} onClick={() => setFilter("week")} />
        </HStack>
        {loading && (
          <Spinner className="size-3 text-[var(--text-faint)] animate-spin [animation-duration:0.8s]" />
        )}
      </SidebarSectionHeader>

      <VStack className="mfdi-scale-list-unified items-stretch gap-0">
        {(filter === "all" || filter === "year") &&
          (() => {
            const yKey = `year-${baseDate.format("YYYY")}`;
            const yCounts = countsMap[yKey];
            const yHasActivity = yCounts && (yCounts.posts > 0 || yCounts.tasks > 0);
            const isSelected = granularity === "year";

            return (
              <SidebarTextButton
                isSelected={isSelected}
                isMuted={!yHasActivity}
                className={cn("mfdi-scale-item mfdi-scale-item-year", isSelected && "is-selected")}
                onClick={() => {
                  if (isSelected) {
                    handleClickHome();
                  } else {
                    setGranularity("year");
                    setDateFilter("today");
                    setDate(baseDate.clone());
                  }
                }}
              >
                <HStack className="gap-0 justify-between w-full">
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
            const mHasActivity = mCounts && (mCounts.posts > 0 || mCounts.tasks > 0);
            const isSelected = granularity === "month";

            return (
              <SidebarTextButton
                isSelected={isSelected}
                isMuted={!mHasActivity}
                className={cn("mfdi-scale-item mfdi-scale-item-month", isSelected && "is-selected")}
                onClick={() => {
                  if (isSelected) {
                    handleClickHome();
                  } else {
                    setGranularity("month");
                    setDateFilter("today");
                    setDate(baseDate.clone());
                  }
                }}
              >
                <HStack className="gap-0 justify-between w-full">
                  <Text as="span">{baseDate.format("YYYY-MM")}</Text>
                  {renderCountBadge(mCounts)}
                </HStack>
              </SidebarTextButton>
            );
          })()}

        {(filter === "all" || filter === "week") &&
          weeks.map((w) => {
            const isSelected = granularity === "week" && date.isSame(w, "isoWeek");
            const counts = countsMap[`week-${w.format("YYYY-WW")}`];
            const hasActivity = counts && (counts.posts > 0 || counts.tasks > 0);

            return (
              <SidebarTextButton
                key={w.format("YYYY-WW")}
                isSelected={isSelected}
                isMuted={!hasActivity}
                className={cn("mfdi-scale-item mfdi-scale-item-week", isSelected && "is-selected")}
                onClick={() => {
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
                <HStack className="gap-0 justify-between w-full">
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
