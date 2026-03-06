import { useEffect } from "react";
import { Task } from "../../app-helper";
import { useAppContext } from "../context/AppContext";
import { MFDIModal } from "../MFDIModal";
import { MFDIView } from "../MFDIView";
import { Granularity, Post, TimeFilter } from "../types";

export interface ViewSyncHandlers {
  /** 投稿送信 */
  handleSubmit: () => Promise<void>;
  /** デイリーノートを開く */
  handleClickOpenDailyNote: () => Promise<void>;
  /** granularity 変更 */
  setGranularity: (g: Granularity) => void;
  setTimeFilter: (t: TimeFilter) => void;
  setCurrentDailyNote: (note: null) => void;
  setPosts: (posts: Post[]) => void;
  setTasks: (tasks: Task[]) => void;
  /** topic 変更 */
  setActiveTopic: (id: string) => void;
  /** asTask 変更 */
  setAsTask: (t: boolean) => void;
  /** modal editor */
  input: string;
  setInput: (s: string) => void;
}

/**
 * ReactView の state/handler を Obsidian View オブジェクトに同期する。
 *
 * View 側から paneMenu や keyboard shortcut でコールバックを呼び出せるよう、
 * `view.onXxx` / `view.xxx` に最新の関数・値を設定する。
 */
export function useViewSync(
  view: MFDIView,
  granularity: Granularity,
  activeTopic: string,
  asTask: boolean,
  timeFilter: TimeFilter,
  {
    handleSubmit,
    handleClickOpenDailyNote,
    setGranularity,
    setTimeFilter,
    setCurrentDailyNote,
    setPosts,
    setTasks,
    setActiveTopic,
    setAsTask,
    input,
    setInput,
  }: ViewSyncHandlers
) {
  const { app } = useAppContext();
  // ── 値の同期（read-only な参照） ──────────────────────────────
  useEffect(() => {
    view.granularity = granularity;
  }, [view, granularity]);

  useEffect(() => {
    view.asTask = asTask;
  }, [view, asTask]);

  useEffect(() => {
    view.timeFilter = timeFilter;
  }, [view, timeFilter]);

  useEffect(() => {
    view.activeTopic = activeTopic;
  }, [view, activeTopic]);

  // ── ハンドラの同期 ─────────────────────────────────────────────
  useEffect(() => {
    view.onSubmit = handleSubmit;
    return () => { view.onSubmit = undefined; };
  }, [view, handleSubmit]);

  useEffect(() => {
    view.onOpenDailyNoteAction = handleClickOpenDailyNote;
    return () => { view.onOpenDailyNoteAction = undefined; };
  }, [view, handleClickOpenDailyNote]);

  useEffect(() => {
    view.onChangeGranularity = (g: Granularity) => {
      setGranularity(g);
      if (g !== "day") setTimeFilter("all");
      setCurrentDailyNote(null);
      setPosts([]);
      setTasks([]);
    };
    return () => { view.onChangeGranularity = undefined; };
  }, [view]);

  useEffect(() => {
    // setActiveTopic is actually handleChangeTopic
    view.onChangeTopic = setActiveTopic;
    return () => { view.onChangeTopic = undefined; };
  }, [view, setActiveTopic]);

  useEffect(() => {
    view.onChangeAsTask = (t: boolean) => { setAsTask(t); };
    return () => { view.onChangeAsTask = undefined; };
  }, [view]);

  useEffect(() => {
    view.onChangeTimeFilter = (t: TimeFilter) => { setTimeFilter(t); };
    return () => { view.onChangeTimeFilter = undefined; };
  }, [view]);

  useEffect(() => {
    view.onOpenModalEditor = () => {
      const modal = new MFDIModal(app, {
        initialContent: input,
        onChange: (content) => { setInput(content); },
        onClose: (content) => { setInput(content); },
      });
      modal.open();
    };
    return () => { view.onOpenModalEditor = undefined; };
  }, [view, app, input]);
}
