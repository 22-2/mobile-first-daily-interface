import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * BroadcastChannel を通じてデータベースの更新通知を受け取り、
 * TanStack Query のキャッシュを無効化するフック。
 */
export function useDbSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = new BroadcastChannel("mfdi-db-updates");

    channel.onmessage = (event) => {
      if (event.data.type === "mfdi-db-updated") {
        // メモに関連するクエリを全て無効化する
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      }
    };

    return () => {
      channel.close();
    };
  }, [queryClient]);
}
