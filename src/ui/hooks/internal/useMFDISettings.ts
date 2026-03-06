import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { granularityConfig } from "../../granularity-config";
import { Granularity, MomentLike, TimeFilter } from "../../types";

import { useAppContext } from "../../context/AppContext";

/**
 * 閲覧設定（トピック、期間、日付、フィルター）を管理するHook。
 * 値の永続化とカレンダー操作のハンドラを提供します。
 */
export function useMFDISettings() {
  const { settings, view, storage } = useAppContext();
  const [activeTopic, setActiveTopic] = useState<string>(
    () => settings.activeTopic ?? ""
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

  const [timeFilter, setTimeFilter] = useState<TimeFilter>(
    () => storage.get<TimeFilter>("timeFilter", "all")
  );

  const handleChangeTopic = useCallback(
    (topicId: string) => {
      if (activeTopic === topicId) return;
      setActiveTopic(topicId);
      // プラグイン側に保存を要求
      view.onTopicSaveRequested?.(topicId);
    },
    [activeTopic, view]
  );

  const handleChangeCalendarDate = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDate(granularityConfig[granularity].parseInput(event.target.value));
    },
    [granularity]
  );

  const handleClickMovePrevious = useCallback(() => {
    setDate(date.clone().subtract(1, granularityConfig[granularity].unit));
  }, [date, granularity]);

  const handleClickMoveNext = useCallback(() => {
    setDate(date.clone().add(1, granularityConfig[granularity].unit));
  }, [date, granularity]);

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

  return {
    activeTopic,
    setActiveTopic: handleChangeTopic,
    granularity,
    setGranularity,
    date,
    setDate,
    timeFilter,
    setTimeFilter,
    handleChangeCalendarDate,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
  };
}
