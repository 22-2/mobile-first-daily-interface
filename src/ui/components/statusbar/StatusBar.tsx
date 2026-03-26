import { FC, useMemo } from "react";
import { FocusLayout } from "src/ui/components/statusbar/layouts/FocusLayout";
import { TagLayout } from "src/ui/components/statusbar/layouts/TagLayout";
import { ThreadLayout } from "src/ui/components/statusbar/layouts/ThreadLayout";
import { TimelineLayout } from "src/ui/components/statusbar/layouts/TimelineLayout";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isTimelineView } from "src/ui/utils/view-mode";
import { useShallow } from "zustand/shallow";

/**
 * 下部のステータス表示（件数、日付、トピックなど）を管理するコントローラー
 *
 * コンポーネント（部品）、レイアウト（配置）、制御ロジックを分離して構成しています。
 */
export const StatusBar: FC = () => {
  const { displayMode, threadFocusRootId, activeTopic } = useSettingsStore(
    useShallow((s) => ({
      displayMode: s.displayMode,
      threadFocusRootId: s.threadFocusRootId,
      activeTopic: s.activeTopic,
    })),
  );

  /**
   * 現在の状態から表示すべきレイアウトを決定するロジック（コントローラー部）
   */
  const layout = useMemo(() => {
    // 1. タイムラインモード: 全期間の投稿を表示
    if (isTimelineView(displayMode)) {
      return <TimelineLayout />;
    }

    // 2. スレッドモード: 特定の投稿以下のツリーを表示
    if (threadFocusRootId) {
      return <ThreadLayout />;
    }

    // 3. タグモード: 特定のトピック/タグで絞り込み中
    if (activeTopic) {
      return <TagLayout />;
    }

    // 4. フォーカスモード: 通常のデイリー/期間表示
    return <FocusLayout />;
  }, [displayMode, threadFocusRootId, activeTopic]);

  return layout;
};
