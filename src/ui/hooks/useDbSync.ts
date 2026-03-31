import { mutate } from "swr";
import { useEffect } from "react";

/**
 * BroadcastChannel を通じてデータベースの更新通知を受け取り、
 * SWR のキャッシュを無効化するフック。
 */
export function useDbSync() {
  useEffect(() => {
    const channel = new BroadcastChannel("mfdi-db-updates");

    channel.onmessage = (event) => {
      if (event.data.type === "mfdi-db-updated") {
        // メモに関連するクエリを全て無効化する
        mutate((key) => Array.isArray(key) && key[0] === "posts");
      }
    };

    return () => {
      channel.close();
    };
  }, []);
}
