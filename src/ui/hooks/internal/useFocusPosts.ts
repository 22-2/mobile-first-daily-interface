import { useMemo } from "react";
import { normalizeFixedNotePath } from "src/core/fixed-note";
import { resolvePeriodicNote } from "src/core/note-source";
import { resolveTimestamp } from "src/core/post-utils";
import { parseThinoEntries } from "src/core/thino";
import { WorkerClient } from "src/db/worker-client";
import { DATE_FILTER_IDS } from "src/ui/config/filter-config";
import { useAppContext } from "src/ui/context/AppContext";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { Post } from "src/ui/types";
import { buildPostFromEntry } from "src/ui/utils/thread-utils";
import { memoRecordToPost } from "src/ui/utils/thread-utils";
import useSWR from "swr";
import { useShallow } from "zustand/shallow";

function isThreadRootMetadata(metadata: Record<string, string>): boolean {
  const threadId = metadata.mfdiId;
  const parentId = metadata.parentId;
  return !!threadId && !parentId;
}

/**
 * フォーカスモード（特定期間の1回読み切り）のデータ取得を担当するHook。
 * 常に IndexedDB から最新のデータを取得する。
 */
export const useFocusPosts = () => {
  const { shell } = useAppContext();
  const {
    activeTopic,
    date,
    granularity,
    dateFilter,
    searchQuery,
    threadOnly,
    viewNoteMode,
    fixedNotePath,
  } = useSettingsStore(
    useShallow((s) => ({
      activeTopic: s.activeTopic,
      date: s.date,
      granularity: s.granularity,
      dateFilter: s.dateFilter,
      searchQuery: s.searchQuery,
      threadOnly: s.threadOnly,
      viewNoteMode: s.viewNoteMode,
      fixedNotePath: s.fixedNotePath,
    })),
  );
  const isFixedMode = viewNoteMode === "fixed";
  const normalizedFixedPath = useMemo(
    () => normalizeFixedNotePath(fixedNotePath ?? ""),
    [fixedNotePath],
  );
  const periodicNoteFile = useMemo(() => {
    if (isFixedMode) return null;
    if (granularity !== "month" && granularity !== "year") return null;
    // 月/年 granularity はノートファイルを直接読む（DB側の path 登録状態に依存しない）
    return resolvePeriodicNote(shell, date, granularity, activeTopic);
  }, [isFixedMode, granularity, date, activeTopic, shell]);

  const { startDate, endDate } = useMemo(() => {
    let start = date.clone().startOf("day");
    let end = date.clone().endOf("day");

    if (granularity === "week" || dateFilter === DATE_FILTER_IDS.THIS_WEEK) {
      start = date.clone().startOf("isoWeek");
      end = date.clone().endOf("isoWeek");
    } else if (granularity === "month") {
      start = date.clone().startOf("month");
      end = date.clone().endOf("month");
    } else if (granularity === "year") {
      start = date.clone().startOf("year");
      end = date.clone().endOf("year");
    } else if (dateFilter === "3d") {
      start = date.clone().subtract(2, "days").startOf("day");
    } else if (dateFilter === "5d") {
      start = date.clone().subtract(4, "days").startOf("day");
    } else if (dateFilter === "7d") {
      start = date.clone().subtract(6, "days").startOf("day");
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [date, granularity, dateFilter]);

  const effectiveTopic = isFixedMode ? undefined : activeTopic;

  const {
    data: posts,
    mutate,
    isValidating,
    error,
  } = useSWR<Post[]>(
    [
      "posts",
      "focus",
      effectiveTopic,
      startDate,
      endDate,
      searchQuery,
      threadOnly,
      viewNoteMode,
      normalizedFixedPath,
      periodicNoteFile?.path,
      date.toISOString(),
    ],
    async () => {
      if (isFixedMode) {
        // fixedノートはDBインデックスではなく、ノート本文を直接読んで表示する。
        if (!normalizedFixedPath) return [];

        let content = "";
        try {
          content = await shell.loadFile(normalizedFixedPath);
        } catch {
          return [];
        }

        const query = searchQuery.trim().toLowerCase();

        return parseThinoEntries(content)
          .filter((entry) => {
            if (query && !entry.message.toLowerCase().includes(query)) {
              return false;
            }
            if (threadOnly && !isThreadRootMetadata(entry.metadata)) {
              return false;
            }
            return true;
          })
          .map((entry) => {
            const timestamp = resolveTimestamp(
              entry.time,
              date,
              entry.metadata,
            );

            return {
              id:
                entry.metadata.mfdiId ??
                `${normalizedFixedPath}:${entry.startOffset}`,
              threadRootId:
                entry.metadata.parentId ?? entry.metadata.mfdiId ?? null,
              timestamp,
              noteDate: timestamp.clone().startOf("day"),
              message: entry.message,
              metadata: entry.metadata,
              offset: entry.offset,
              startOffset: entry.startOffset,
              endOffset: entry.endOffset,
              bodyStartOffset: entry.bodyStartOffset,
              kind: "thino",
              path: normalizedFixedPath,
            } as Post;
          });
      }

      // 月/年 granularity はノートファイルを直接読むことで常に最新の内容を反映する
      if (periodicNoteFile) {
        try {
          const content = await shell.loadFile(periodicNoteFile.path);
          const query = searchQuery.trim().toLowerCase();

          return parseThinoEntries(content)
            .filter((entry) => {
              if (query && !entry.message.toLowerCase().includes(query)) {
                return false;
              }
              if (threadOnly && !isThreadRootMetadata(entry.metadata)) {
                return false;
              }
              return true;
            })
            .map((entry) => {
              const timestamp = resolveTimestamp(
                entry.time,
                date,
                entry.metadata,
              );

              return buildPostFromEntry({
                ...entry,
                path: periodicNoteFile.path,
                noteDate: timestamp.clone().startOf(granularity),
                resolveTimestamp,
              });
            });
        } catch {
          console.error("Failed to load periodic note file:", periodicNoteFile.path);
          return [];
        }
      }

      const dbService = WorkerClient.get();
      const records = await dbService.getMemos({
        topicId: effectiveTopic,
        startDate,
        endDate,
        query: searchQuery,
        threadOnly,
      });

      const posts = records.map(memoRecordToPost);
      return posts;
    },
  );

  return useMemo(
    () => ({
      posts: posts ?? [],
      mutate,
      isLoading: !posts && !error,
      isValidating,
    }),
    [posts, mutate, error, isValidating],
  );
};
