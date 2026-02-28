import { App, TFile } from "obsidian";
import { useEffect } from "react";
import { Task } from "../../app-helper";
import { getNoteSettings } from "../granularity-config";
import { Granularity, MomentLike, Post } from "../types";

interface UseNoteSyncOptions {
  app: App;
  date: MomentLike;
  granularity: Granularity;
  currentDailyNote: TFile | null;
  setDate: (d: MomentLike) => void;
  setTasks: (t: Task[]) => void;
  setPosts: (p: Post[]) => void;
  updateCurrentDailyNote: () => void;
  updatePosts: (note: TFile) => Promise<void>;
  updateTasks: (note: TFile) => Promise<void>;
}

export function useNoteSync({
  app,
  date,
  granularity,
  currentDailyNote,
  setDate,
  setTasks,
  setPosts,
  updateCurrentDailyNote,
  updatePosts,
  updateTasks,
}: UseNoteSyncOptions) {
  useEffect(() => {
    const eventRef = app.metadataCache.on(
      "changed",
      async (file, _data, _cache) => {
        // currentDailyNoteが存在してパスが異なるなら、違う日なので更新は不要
        if (currentDailyNote != null && file.path !== currentDailyNote.path) {
          return;
        }

        if (currentDailyNote == null) {
          const ds = getNoteSettings(granularity);
          const dir = ds.folder ? `${ds.folder}/` : "";
          const entry = date.format(ds.format ?? "YYYY-MM-DD");
          // 更新されたファイルがcurrentNoteになるべきファイルではなければ処理は不要
          if (file.path !== `${dir}${entry}.md`) {
            return;
          }
        }

        // 同期などで裏でDaily Noteが作成されたときに更新する
        updateCurrentDailyNote();
        await Promise.all([updatePosts(file), updateTasks(file)]);
      }
    );

    const deleteEventRef = app.vault.on("delete", async (file) => {
      // currentDailyNoteとは別のファイルなら関係ない
      if (file.path !== currentDailyNote?.path) {
        return;
      }

      // 再読み込みをするためにクローンを入れて参照を更新
      setDate(date.clone());
      setTasks([]);
      setPosts([]);
    });

    return () => {
      app.metadataCache.offref(eventRef);
      app.vault.offref(deleteEventRef);
    };
  }, [date, currentDailyNote, granularity]);
}
