import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { DateFilter, Granularity, MomentLike, TimeFilter } from "../../types";

import { granularityConfig } from "../../config/granularity-config";
import { useAppContext } from "../../context/AppContext";

/**
 * 閲覧設定（トピック、期間、日付、フィルター）を管理するHook。
 * 値の永続化とカレンダー操作のハンドラを提供します。
 */
export function useMFDISettings() {
  const { settings, view, storage } = useAppContext();
  const [activeTopic, setActiveTopic] = useState<string>(
    () => settings.activeTopic ?? "",
  );

  const [granularity, setGranularity] = useState<Granularity>(() => {
    const savedOffset = storage.get<number | null>("editingPostOffset", null);
    if (savedOffset !== null) {
      return storage.get<Granularity>("editingPostGranularity", "day");
    }
    return storage.get<Granularity>("granularity", "day");
  });

  const [date, setDate] = useState<MomentLike>(() => {
    const savedOffset = storage.get<number | null>("editingPostOffset", null);
    let saved = null;
    if (savedOffset !== null) {
      saved = storage.get<string | null>("editingPostDate", null);
    } else {
      saved = storage.get<string | null>("date", null);
    }
    const m = saved ? window.moment(saved) : window.moment();
    return m.isValid() ? m : window.moment();
  });

  const [timeFilter, setTimeFilter] = useState<TimeFilter>(() =>
    storage.get<TimeFilter>("timeFilter", "all"),
  );

  const [dateFilter, setDateFilter] = useState<DateFilter>(() =>
    storage.get<DateFilter>("dateFilter", "today"),
  );

  const handleChangeTopic = useCallback(
    (topicId: string) => {
      if (activeTopic === topicId) return;
      setActiveTopic(topicId);
      // プラグイン側に保存を要求
      view.handlers.onTopicSaveRequested?.(topicId);
    },
    [activeTopic, view],
  );

  const handleChangeCalendarDate = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDate(granularityConfig[granularity].parseInput(event.target.value));
    },
    [granularity],
  );

  const getMoveStep = useCallback(() => {
    if (granularity !== "day") return 1;
    if (dateFilter === "this_week") return 7;
    const days = parseInt(dateFilter);
    return isNaN(days) ? 1 : days;
  }, [granularity, dateFilter]);

  const handleClickMovePrevious = useCallback(() => {
    const step = getMoveStep();
    setDate(date.clone().subtract(step, granularityConfig[granularity].unit));
  }, [date, granularity, getMoveStep]);

  const handleClickMoveNext = useCallback(() => {
    const step = getMoveStep();
    setDate(date.clone().add(step, granularityConfig[granularity].unit));
  }, [date, granularity, getMoveStep]);

  const handleClickToday = useCallback(() => {
    setDate(window.moment());
  }, []);

  // ────────────────────────────────────────────────────────────
  // Storage Persistence
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    storage.set("granularity", granularity);
  }, [granularity, storage]);

  useEffect(() => {
    storage.set("date", date.toISOString());
  }, [date, storage]);

  useEffect(() => {
    storage.set("timeFilter", timeFilter);
  }, [timeFilter, storage]);

  useEffect(() => {
    storage.set("dateFilter", dateFilter);
  }, [dateFilter, storage]);

  return {
    activeTopic,
    setActiveTopic: handleChangeTopic,
    granularity,
    setGranularity,
    date,
    setDate,
    timeFilter,
    setTimeFilter,
    dateFilter,
    setDateFilter,
    handleChangeCalendarDate,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
    getMoveStep,
  };
}
