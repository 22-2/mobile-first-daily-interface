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
        // 全ての 'posts' に関連するキャッシュを再検証する。
        // これだけで全ビューが自動的に最新化される。
        mutate((key) => Array.isArray(key) && key[0] === "posts");
      }
    };

    return () => {
      channel.close();
    };
  }, [store, context]);
}
