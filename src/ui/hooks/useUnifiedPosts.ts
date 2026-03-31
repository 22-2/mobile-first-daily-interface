import { useMemo } from "react";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isTimelineView } from "src/ui/utils/view-mode";
import { useShallow } from "zustand/shallow";
import { useInfiniteTimeline } from "src/ui/hooks/internal/useInfiniteTimeline";
import { useFocusPosts } from "src/ui/hooks/internal/useFocusPosts";

/**
 * タイムラインモードとフォーカスモードの両方を抽象化した、
 * 統合的なデータ取得Hook。
 */
export const useUnifiedPosts = () => {
  const { displayMode } = useSettingsStore(
    useShallow((s) => ({ displayMode: s.displayMode }))
  );

  const timelineView = isTimelineView(displayMode);
  
  // 両方のフックを呼ぶが、SWR内部で不必要なフェッチは行われない（key=nullになれば）
  const infinity = useInfiniteTimeline();
  const focus = useFocusPosts();

  const result = useMemo(() => {
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
  }, [timelineView, infinity, focus]);

  return result;
};
