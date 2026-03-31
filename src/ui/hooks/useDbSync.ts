import { mutate } from "swr";
import { useEffect } from "react";
import { useCurrentAppStore } from "src/ui/store/appStore";
import { isTimelineView } from "src/ui/utils/view-mode";
import { useAppContext } from "src/ui/context/AppContext";

/**
 * BroadcastChannel を通じてデータベースの更新通知を受け取り、
 * SWR のキャッシュを無効化するフック。
 */
export function useDbSync() {
  const store = useCurrentAppStore();
  const context = useAppContext();

  useEffect(() => {
    const channel = new BroadcastChannel("mfdi-db-updates");

    channel.onmessage = (event) => {
      if (event.data.type === "mfdi-db-updated") {
        // メモに関連するクエリを全て無効化する
        mutate((key) => Array.isArray(key) && key[0] === "posts");

        // Zustand ストアの状態も最新に同期する
        const state = store.getState();
        if (isTimelineView(state.displayMode)) {
          // タイムラインモード時はDB全体から更新
          state.updatePostsFromDB({
            topicId: state.activeTopic,
          });
        } else {
          // それ以外の時は現在のデイリーノートを再読込
          const { shell } = context;
          if (shell) {
            state.updateCurrentDailyNote(shell);
            if (state.currentDailyNote) {
              state.updatePosts(state.currentDailyNote);
            }
          }
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [store, context]);
}
