import { useCallback, useState } from "react";

/**
 * 複数日表示モード（週表示やN日表示）において、
 * 変更監視の対象とするファイルパスの集合を管理するHook。
 */
export function useWeekNotePaths() {
  const [weekNotePaths, setWeekNotePaths] = useState<Set<string>>(new Set());

  const addPaths = useCallback((paths: Set<string>) => {
    setWeekNotePaths((prev) => {
      const next = new Set(prev);
      paths.forEach((p) => next.add(p));
      return next;
    });
  }, []);

  const replacePaths = useCallback((paths: Set<string>) => {
    setWeekNotePaths(paths);
  }, []);

  const clearPaths = useCallback(() => {
    setWeekNotePaths(new Set());
  }, []);

  return {
    weekNotePaths,
    setWeekNotePaths, // 下位互換性のため残す
    addPaths,
    replacePaths,
    clearPaths,
  };
}
