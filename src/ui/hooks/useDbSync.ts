import { useSWRConfig } from "swr";
import { useEffect } from "react";
import { useCurrentAppStore } from "src/ui/store/appStore";
import { useAppContext } from "src/ui/context/AppContext";
import { isPostsKey } from "src/ui/utils/swr-utils";

/**
 * BroadcastChannel を通じてデータベースの更新通知を受け取り、
 * SWR のキャッシュを無効化するフック。
 */
export function useDbSync() {
  const store = useCurrentAppStore();
  const context = useAppContext();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const channel = new BroadcastChannel("mfdi-db-updates");

    channel.onmessage = (event) => {
      if (event.data.type === "mfdi-db-updated") {
        // 全ての 'posts' に関連するキャッシュを再検証する。
        // これだけで全ビューが自動的に最新化される。
        mutate(isPostsKey);
      }
    };

    // 初期マウント時に一度明示的に再検証を行う。
    // メンタルモデル: ワーカー側のフルスキャンや更新通知が
    // React の BroadcastChannel リスナ登録より先に発生すると、通知を取りこぼす。
    // マウント時に mutate を投げておくことで、初回インデックスの結果を確実に反映させる。
    // （副作用は最小で、既に最新ならフェッチは短時間で終わる）
    void mutate(isPostsKey);

    return () => {
      channel.close();
    };
  }, [store, context, mutate]);
}
