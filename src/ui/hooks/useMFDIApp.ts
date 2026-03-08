import { Menu, Notice, TFile } from "obsidian";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { Task } from "../../app-helper";
import { postFormatMap } from "../../settings";
import { createTopicNote, getTopicNote } from "../../utils/daily-notes";
import { useAppContext } from "../context/AppContext";
import { DeleteConfirmModal } from "../DeleteConfirmModal";
import { granularityConfig } from "../granularity-config";
import { toText } from "../post-utils";
import { Post } from "../types";
import { useMFDIEditor } from "./internal/useMFDIEditor";
import { useMFDISettings } from "./internal/useMFDISettings";
import { handleThisWeekSyncOnSubmit } from "./internal/useMFDISyncLogic";
import { useNoteSync } from "./useNoteSync";
import { usePostsAndTasks } from "./usePostsAndTasks";

interface UseMFDIAppOptions {}

/**
 * Mobile First Daily Interface アプリ全体のロジックを統合管理するメインHook。
 * データの取得、更新、設定、編集状態のオーケストレーションを行います。
 */
export function useMFDIApp(_options?: UseMFDIAppOptions) {
  const { app, appHelper, storage, settings } = useAppContext();

  const {
    activeTopic,
    setActiveTopic,
    granularity,
    setGranularity,
    date,
    setDate,
    timeFilter,
    setTimeFilter,
    handleChangeCalendarDate,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
  } = useMFDISettings();

  const [currentDailyNote, setCurrentDailyNote] = useState<TFile | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const postFormat = postFormatMap[settings.postFormatOption];

  const { posts, tasks, setPosts, setTasks, updatePosts, updateTasks, updatePostsForWeek } =
    usePostsAndTasks({ postFormat, date, granularity });

  // "this_week" モード中に監視する今週のファイルパス集合
  const weekNotePathsRef = useRef<Set<string>>(new Set());

  const {
    input,
    setInput,
    asTask,
    setAsTask,
    editingPost,
    editingPostOffset,
    setEditingPostOffset,
    inputRef,
    canSubmit,
    startEdit,
    cancelEdit,
  } = useMFDIEditor({ posts, date, granularity });

  const isToday = useMemo(() => {
    return date.isSame(window.moment(), granularityConfig[granularity].unit);
  }, [date, granularity]);

  const updateCurrentDailyNote = useCallback(() => {
    const n = getTopicNote(app, date, granularity, activeTopic);
    if (n?.path !== currentDailyNote?.path) {
      setCurrentDailyNote(n);
    }
  }, [app, date, granularity, activeTopic, currentDailyNote]);

  const handleChangeTopic = useCallback(
    (topicId: string) => {
      if (activeTopic === topicId) return;
      setActiveTopic(topicId);
      setCurrentDailyNote(null);
      setPosts([]);
      setTasks([]);
    },
    [activeTopic, setActiveTopic, setPosts, setTasks]
  );

  useEffect(() => {
    updateCurrentDailyNote();
  }, [date, granularity, activeTopic, updateCurrentDailyNote]);

  useEffect(() => {
    if (!currentDailyNote) return;
    const promises: Promise<void>[] = [updateTasks(currentDailyNote)];
    if (timeFilter !== "this_week") {
      promises.push(updatePosts(currentDailyNote));
    }
    Promise.all(promises);
  }, [currentDailyNote, updatePosts, updateTasks, timeFilter]);

  useNoteSync({
    date,
    granularity,
    topicId: activeTopic,
    currentDailyNote,
    weekNotePaths: timeFilter === "this_week" ? weekNotePathsRef.current : undefined,
    setDate,
    setTasks,
    setPosts,
    updateCurrentDailyNote,
    updatePosts,
    updateTasks,
    onWeekNoteChanged: timeFilter === "this_week"
      ? () => { updatePostsForWeek(activeTopic).then((paths) => { weekNotePathsRef.current = paths; }); }
      : undefined,
  });

  // "this_week" に切り替わったら今週のノートをロード
  useEffect(() => {
    if (timeFilter !== "this_week" || granularity !== "day" || asTask) return;
    updatePostsForWeek(activeTopic).then((paths) => {
      weekNotePathsRef.current = paths;
    });
  }, [timeFilter, granularity, asTask, activeTopic, updatePostsForWeek]);

  const createNoteWithInsertAfter = async () => {
    const created = await createTopicNote(app, date, granularity, activeTopic);
    if (created && settings.insertAfter) {
      const content = await app.vault.read(created);
      if (!content.includes(settings.insertAfter)) {
        await app.vault.modify(
          created,
          content ? `${content}\n${settings.insertAfter}` : settings.insertAfter
        );
      }
    }
  };

  const handleClickOpenDailyNote = async () => {
    if (!currentDailyNote) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      await createNoteWithInsertAfter();
      setDate(date.clone());
    }
    const note = getTopicNote(app, date, granularity, activeTopic);
    if (note) {
      await app.workspace.getLeaf(true).openFile(note);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    // 最新の入力をエディタから直接取得（debounceによる遅延対策）
    const currentInput = inputRef.current?.getValue() ?? input;

    if (editingPost) {
      if (!currentDailyNote) return;
      const path = currentDailyNote.path;
      let targetTs = editingPost.timestamp;
      const now = window.moment();
      if (settings.updateDateStrategy === "always") {
        targetTs = now;
      } else if (settings.updateDateStrategy === "same_day") {
        if (editingPost.timestamp.isSame(now, "day")) {
          targetTs = now;
        }
      }
      const text = toText(currentInput, false, postFormat, granularity, targetTs);
      await appHelper.replaceRange(
        path,
        editingPost.startOffset,
        editingPost.endOffset,
        text
      );
      cancelEdit();
      await updatePosts(currentDailyNote);
      return;
    }

    const text = toText(currentInput, asTask, postFormat, granularity);
    if (!text) {
      setInput("");
      inputRef.current?.setContent("");
      return;
    }

    if (!currentDailyNote) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      await createNoteWithInsertAfter();
      handleThisWeekSyncOnSubmit({
        timeFilter,
        currentDailyNote,
        activeTopic,
        updatePostsForWeek,
        setWeekNotePaths: (paths) => {
          weekNotePathsRef.current = paths;
        },
      });
      setDate(date.clone());
    }
    const note = getTopicNote(app, date, granularity, activeTopic);
    if (note) {
      await appHelper.insertTextAfter(note, `\n${text}`, settings.insertAfter);
    }
    setInput("");
    inputRef.current?.setContent("");
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [
    canSubmit,
    editingPost,
    currentDailyNote,
    settings,
    postFormat,
    granularity,
    appHelper,
    input,
    asTask,
    date,
    activeTopic,
    updatePosts,
    updatePostsForWeek,
    createNoteWithInsertAfter,
    cancelEdit,
    setInput,
    setDate,
    timeFilter,
  ]);

  const deletePost = useCallback(
    async (post: Post) => {
      if (!isToday) {
        new Notice("過去のノートの投稿は削除できません");
        return;
      }
      if (!currentDailyNote) return;
      const path = currentDailyNote.path;
      const origin = await appHelper.loadFile(path);
      let start = post.startOffset;
      let end = post.endOffset;
      if (origin.slice(end, end + 1) === "\n") end += 1;
      await appHelper.replaceRange(path, start, end, "");
      let newContent = await appHelper.loadFile(path);
      newContent = newContent.replace(/\n{4,}/g, "\n\n\n");
      await app.vault.adapter.write(path, newContent);
      if (editingPost?.startOffset === post.startOffset) cancelEdit();
      await updatePosts(currentDailyNote);
    },


    [
      currentDailyNote,
      appHelper,
      app.vault.adapter,
      editingPost?.startOffset,
      cancelEdit,
      updatePosts,
    ]
  );


  const handleClickTime = useCallback(
    (post: Post) => {
      (async () => {
        if (!currentDailyNote) return;
        const leaf = app.workspace.getLeaf(true);
        await app.workspace.revealLeaf(leaf);
        await leaf.openFile(currentDailyNote, { active: true });
        await app.workspace.revealLeaf(leaf);
        const editor = app.workspace.activeEditor!;
        const startPos = editor.editor!.offsetToPos(post.bodyStartOffset);
        const endPos = editor.editor!.offsetToPos(
          post.bodyStartOffset + post.message.length
        );
        const from = { line: startPos.line, ch: startPos.ch };
        const to = { line: endPos.line, ch: endPos.ch };
        queueMicrotask(() => {
          // @ts-expect-error
          editor.editMode!.highlightSearchMatches([{ from, to }]);
        });
      })();
    },
    [currentDailyNote, app.workspace]
  );


  const updateTaskChecked = useCallback(
    async (task: Task, checked: boolean) => {
      if (!isToday) {
        new Notice("過去のノートのタスクは変更できません");
        return;
      }
      if (!currentDailyNote) return;
      const mark = checked ? "x" : " ";
      setTasks(
        tasks.map((x) => (x.offset === task.offset ? { ...x, mark } : x))
      );
      await appHelper.setCheckMark(currentDailyNote.path, mark, task.offset);
    },
    [currentDailyNote, tasks, setTasks, appHelper]
  );


  const openTaskInEditor = (task: Task) => {
    (async () => {
      if (!currentDailyNote) return;
      const leaf = app.workspace.getLeaf(true);
      await leaf.openFile(currentDailyNote);
      const editor = appHelper.getActiveMarkdownEditor()!;
      if (!editor) return;
      const pos = editor.offsetToPos(task.offset);
      editor.setCursor(pos);
      await leaf.openFile(currentDailyNote, {
        eState: { line: pos.line },
      });
    })();
  };

  const deleteTask = async (task: Task) => {
    if (!isToday) {
      new Notice("過去のノートのタスクは削除できません");
      return;
    }
    if (!currentDailyNote) return;
    const path = currentDailyNote.path;
    const origin = await appHelper.loadFile(path);
    let start = task.offset;
    let end = origin.indexOf("\n", start);
    if (end === -1) end = origin.length;
    else end += 1;
    await appHelper.replaceRange(path, start, end, "");
    let newContent = await appHelper.loadFile(path);
    newContent = newContent.replace(/\n{4,}/g, "\n\n\n");
    await app.vault.adapter.write(path, newContent);
    setTasks((await appHelper.getTasks(currentDailyNote)) ?? []);
  };

  const taskContextMenu = useCallback(
    (task: Task, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const menu = new Menu();
      menu.addItem((item) =>
        item.setTitle("タスクにジャンプ").onClick(() => openTaskInEditor(task))
      );
      menu.addItem((item) =>
        item.setTitle("編集").onClick(() => openTaskInEditor(task))
      );
      menu.addItem((item) =>
        item
          .setTitle("削除")
          .setDisabled(!isToday)
          .onClick(() => {
            new DeleteConfirmModal(app, () => deleteTask(task)).open();
          })
      );
      menu.showAtMouseEvent(e as unknown as MouseEvent);
    },
    [app, openTaskInEditor, deleteTask]
  );


  const filteredPosts = useMemo(() => {
    // this_week モードでは既に updatePostsForWeek で今週全件が posts に入っているのでそのまま返す
    if (timeFilter === "this_week") return posts;
    if (timeFilter === "all" || asTask || granularity !== "day") return posts;
    if (timeFilter === "latest") return posts.length > 0 ? [posts[0]] : [];
    const now = window.moment();
    return posts.filter(
      (p) => now.diff(p.timestamp, "hours") < (timeFilter as number)
    );
  }, [posts, timeFilter, asTask, granularity]);

  return {
    // States
    activeTopic,
    setActiveTopic: handleChangeTopic,
    granularity,
    setGranularity,
    date,
    setDate,
    currentDailyNote,
    setCurrentDailyNote,
    input,
    setInput,
    asTask,
    setAsTask,
    editingPost,
    editingPostOffset,
    timeFilter,
    setTimeFilter,
    posts,
    setPosts,
    filteredPosts,
    tasks,
    setTasks,
    canSubmit,
    // Refs
    inputRef,
    scrollContainerRef,
    // Handlers
    handleChangeCalendarDate,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
    handleClickOpenDailyNote,
    handleSubmit,
    startEdit,
    cancelEdit,
    deletePost,
    handleClickTime,
    updateTaskChecked,
    openTaskInEditor,
    deleteTask,
    taskContextMenu,
    isToday,
  };
}
