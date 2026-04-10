import { memoRecordToPost } from "src/ui/utils/thread-utils";
import { useMemo } from "react";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { Post } from "src/ui/types";
import { buildTargetPostBacklinkCountMap } from "src/ui/utils/post-backlinks";
import useSWR from "swr";

export function usePostBacklinkCounts(targetPosts: Post[]): Map<string, number> {
  const db = useMFDIDB();
  const activeTopic = useSettingsStore((state) => state.activeTopic);
  const topicId = activeTopic || undefined;

  const { data: sourcePosts = [] } = useSWR<Post[]>(
    db ? ["posts", "backlinks", topicId ?? "all"] : null,
    async () => {
      const total = await db.countMemos(topicId);
      if (total === 0) {
        return [];
      }

      // 意図: backlink は現在表示中の日付だけでは閉じず、
      // 他日付の投稿からの参照も数える必要があるため、visible memo を全件取得する。
      const records = await db.getMemos({ topicId, limit: total });
      return records.map(memoRecordToPost);
    },
  );

  return useMemo(
    () => buildTargetPostBacklinkCountMap(targetPosts, sourcePosts),
    [targetPosts, sourcePosts],
  );
}
