import useSWR from "swr";
import { useMemo } from "react";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { memoRecordToPost } from "src/ui/utils/thread-utils";
import { useShallow } from "zustand/shallow";
import type { Post } from "src/ui/types";
import { DATE_FILTER_IDS } from "src/ui/config/filter-config";

/**
 * フォーカスモード（特定期間の1回読み切り）のデータ取得を担当するHook。
 * 常に IndexedDB から最新のデータを取得する。
 */
export const useFocusPosts = () => {
  const dbService = useMFDIDB();
  const { activeTopic, date, granularity, dateFilter, searchQuery } = useSettingsStore(
    useShallow((s) => ({
      activeTopic: s.activeTopic,
      date: s.date,
      granularity: s.granularity,
      dateFilter: s.dateFilter,
      searchQuery: s.searchQuery,
    })),
  );

  // 取得範囲（startDate, endDate）を決定
  const { startDate, endDate } = useMemo(() => {
    let start = date.clone().startOf("day");
    let end = date.clone().endOf("day");

    if (granularity === "week" || dateFilter === DATE_FILTER_IDS.THIS_WEEK) {
      start = date.clone().startOf("isoWeek");
      end = date.clone().endOf("isoWeek");
    } else if (granularity === "month") {
      start = date.clone().startOf("month");
      end = date.clone().endOf("month");
    } else if (granularity === "year") {
      start = date.clone().startOf("year");
      end = date.clone().endOf("year");
    } else if (dateFilter === "3d") {
      start = date.clone().subtract(2, "days").startOf("day");
    } else if (dateFilter === "5d") {
      start = date.clone().subtract(4, "days").startOf("day");
    } else if (dateFilter === "7d") {
      start = date.clone().subtract(6, "days").startOf("day");
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  }, [date, granularity, dateFilter]);

  const { data: records, mutate, isValidating, error } = useSWR(
    ["posts", "focus", activeTopic, startDate, endDate, searchQuery],
    async () => {
      return await dbService.getMemos({
        topicId: activeTopic,
        startDate,
        endDate,
        query: searchQuery,
      });
    }
  );

  const posts = useMemo(() => {
    return (records ?? []).map(memoRecordToPost);
  }, [records]);

  return {
    posts,
    mutate,
    isLoading: !records && !error,
    isValidating,
  };
};
