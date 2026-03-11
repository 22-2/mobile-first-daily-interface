import { App, Notice, TFile } from "obsidian";
import { useCallback, useEffect, useState } from "react";
import { Settings } from "src/settings";
import { Granularity, MomentLike, Post } from "src/ui/types";
import { createTopicNote, getTopicNote } from "src/utils/daily-notes";

interface UseNoteManagerProps {
  app: App;
  settings: Settings;
  date: MomentLike;
  granularity: Granularity;
  activeTopic: string;
  setActiveTopic: (topicId: string) => void;
  setPosts: (posts: Post[]) => void;
  setTasks: (tasks: any[]) => void;
}

/**
 * ノート（TFile）の取得、作成、トピック切り替えを管理するHook。
 */
export const useNoteManager = ({
  app,
  settings,
  date,
  granularity,
  activeTopic,
  setActiveTopic,
  setPosts,
  setTasks,
}: UseNoteManagerProps) => {
  const [currentDailyNote, setCurrentDailyNote] = useState<TFile | null>(null);

  const updateCurrentDailyNote = useCallback(() => {
    const n = getTopicNote(app, date, granularity, activeTopic);
    if (n?.path !== currentDailyNote?.path) {
      setCurrentDailyNote(n);
    }
  }, [app, date, granularity, activeTopic, currentDailyNote]);

  useEffect(() => {
    updateCurrentDailyNote();
  }, [date, granularity, activeTopic, updateCurrentDailyNote]);

  const createNoteWithInsertAfter = useCallback(
    async (targetDate?: MomentLike) => {
      const d = targetDate ?? date;
      const created = await createTopicNote(app, d, granularity, activeTopic);
      if (created && settings.insertAfter) {
        const content = await app.vault.read(created);
        if (!content.includes(settings.insertAfter)) {
          await app.vault.modify(
            created,
            content
              ? `${content}\n${settings.insertAfter}`
              : settings.insertAfter,
          );
        }
      }
      return created;
    },
    [app, date, granularity, activeTopic, settings.insertAfter],
  );

  const handleChangeTopic = useCallback(
    (topicId: string) => {
      if (activeTopic === topicId) return;
      setActiveTopic(topicId);
      setCurrentDailyNote(null);
      setPosts([]);
      setTasks([]);
    },
    [activeTopic, setActiveTopic, setPosts, setTasks],
  );

  return {
    currentDailyNote,
    setCurrentDailyNote,
    updateCurrentDailyNote,
    createNoteWithInsertAfter,
    handleChangeTopic,
  };
};
