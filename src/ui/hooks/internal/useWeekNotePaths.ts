import { useNoteStore } from "src/ui/store/noteStore";
import { useShallow } from "zustand/shallow";

/**
 * 複数日表示モード（週表示やN日表示）において、
 * 変更監視の対象とするファイルパスの集合を管理するHook。
 */
export function useWeekNotePaths() {
  const state = useNoteStore(
    useShallow((s) => ({
      weekNotePaths: s.weekNotePaths,
      setWeekNotePaths: s.replacePaths, // 互換性のためのエイリアス
      addPaths: s.addPaths,
      replacePaths: s.replacePaths,
      clearPaths: s.clearPaths,
    })),
  );

  return state;
}
