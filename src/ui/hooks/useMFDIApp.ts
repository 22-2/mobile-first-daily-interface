import { useEffect } from "react";
import { useMFDIEditor } from "src/ui/hooks/internal/useMFDIEditor";
import { useMFDISettings } from "src/ui/hooks/internal/useMFDISettings";
import { useMultiDaySync } from "src/ui/hooks/internal/useMultiDaySync";
import { useNoteManager } from "src/ui/hooks/internal/useNoteManager";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useNoteSync } from "src/ui/hooks/useNoteSync";
import { usePostsAndTasks } from "src/ui/hooks/usePostsAndTasks";

interface UseMFDIAppOptions {}

/**
 * Mobile First Daily Interface アプリ全体のロジックを統合管理するメインHook。
 * データの取得、更新、設定、編集状態のオーケストレーションを行います。
 */
export function useMFDIApp(_options?: UseMFDIAppOptions) {
  const { date, granularity, activeTopic, dateFilter, asTask, isReadOnly, displayMode } = useMFDISettings();

  const postsState = usePostsAndTasks({ date });

  const {
    currentDailyNote,
  } = useNoteManager();

  const {
    inputRef,
  } = useMFDIEditor({ posts: postsState.posts });

  usePostActions();

  // ビュー状態変更時のオートフォーカス
  useEffect(() => {
    if (!isReadOnly && inputRef.current) {
      setTimeout(() => inputRef.current?.focus());
    }
  }, [date, granularity, activeTopic, dateFilter, asTask, isReadOnly, inputRef]);

  useEffect(() => {
    if (!currentDailyNote) return;
    const promises: Promise<void>[] = [postsState.updateTasks(currentDailyNote)];
    if (dateFilter === "today") {
      promises.push(postsState.updatePosts(currentDailyNote));
    }
    Promise.all(promises);
  }, [currentDailyNote, postsState.updateTasks, postsState.updatePosts, dateFilter]);

  useMultiDaySync();
  useNoteSync();

  return {
    inputRef,
    currentDailyNote,
  };
}
