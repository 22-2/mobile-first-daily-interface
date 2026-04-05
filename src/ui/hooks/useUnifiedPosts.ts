import { useMemo } from "react";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isTimelineView } from "src/ui/utils/view-mode";
import { useShallow } from "zustand/shallow";
import { useInfiniteTimeline } from "src/ui/hooks/internal/useInfiniteTimeline";
import { useFocusPosts } from "src/ui/hooks/internal/useFocusPosts";
import type { DisplayMode } from "src/ui/types";
import type { MFDINoteMode } from "src/ui/view/state";

export function shouldUseTimelineView(params: {
  displayMode: DisplayMode;
  viewNoteMode: MFDINoteMode;
}): boolean {
  const { displayMode, viewNoteMode } = params;
  // fixedノートでは常に単一ノートの一覧を表示したいため、
  // 永続化済みの displayMode が timeline でも focus系取得へ固定する。
  return viewNoteMode !== "fixed" && isTimelineView(displayMode);
}

/**
 * タイムラインモードとフォーカスモードの両方を抽象化した、
 * 統合的なデータ取得Hook。
 */
export const useUnifiedPosts = () => {
  const { displayMode, viewNoteMode } = useSettingsStore(
    useShallow((s) => ({
      displayMode: s.displayMode,
      viewNoteMode: s.viewNoteMode,
    }))
  );

  const timelineView = shouldUseTimelineView({ displayMode, viewNoteMode });

  // 両方のフックを呼ぶが、SWR内部で不必要なフェッチは行われない（key=nullになれば）
  const infinity = useInfiniteTimeline();
  const focus = useFocusPosts();

  return useMemo(() => {
    if (timelineView) {
      return {
        posts: infinity.allPosts,
        loadMore: infinity.loadMore,
        hasMore: infinity.hasMore,
        isLoading: infinity.isLoading,
        isValidating: infinity.isValidating,
      };
    } else {
      return {
        posts: focus.posts,
        loadMore: () => {}, // フォーカスモードは無限スクロールなし
        hasMore: false,
        isLoading: focus.isLoading,
        isValidating: focus.isValidating,
      };
    }
  }, [
    timelineView,
    infinity.allPosts,
    infinity.loadMore,
    infinity.hasMore,
    infinity.isLoading,
    infinity.isValidating,
    focus.posts,
    focus.isLoading,
    focus.isValidating,
  ]);
};
