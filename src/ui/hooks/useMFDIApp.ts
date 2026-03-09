import { Menu, Notice, TFile } from "obsidian";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Task } from "../../app-helper";
import { postFormatMap } from "../../settings";
import { createTopicNote, getTopicNote } from "../../utils/daily-notes";
import { granularityConfig } from "../config/granularity-config";
import { useAppContext } from "../context/AppContext";
import { DeleteConfirmModal } from "../modals/DeleteConfirmModal";
import { Post } from "../types";
import { toText } from "../utils/post-utils";
import { useMFDIEditor } from "./internal/useMFDIEditor";
import { useMFDISettings } from "./internal/useMFDISettings";
import { useNoteSync } from "./useNoteSync";
import { usePostsAndTasks } from "./usePostsAndTasks";

interface UseMFDIAppOptions {}

/**
 * Mobile First Daily Interface アプリ全体のロジックを統合管理するメインHook。
 * データの取得、更新、設定、編集状態のオーケストレーションを行います。
 */
export function useMFDIApp(_options?: UseMFDIAppOptions) {
  const { app, appHelper, settings } = useAppContext();

  const {
    activeTopic,
    setActiveTopic,
    granularity,
    setGranularity,
    date,
    setDate,
    timeFilter,
    setTimeFilter,
    dateFilter,
    setDateFilter,
    sidebarOpen,
    setSidebarOpen,
    handleChangeCalendarDate,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
    getMoveStep,
  } = useMFDISettings();

  const [currentDailyNote, setCurrentDailyNote] = useState<TFile | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const postFormat = postFormatMap[settings.postFormatOption];

  const {
    posts,
    tasks,
    setPosts,
    setTasks,
    updatePosts,
    updateTasks,
    updatePostsForWeek,
    updatePostsForDays,
  } = usePostsAndTasks({ postFormat, date, granularity });

  // 複数日モード中に監視するファイルパス集合
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

  const isReadOnly = useMemo(() => {
    return date.isBefore(window.moment(), granularityConfig[granularity].unit);
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
    [activeTopic, setActiveTopic, setPosts, setTasks],
  );

  useEffect(() => {
    updateCurrentDailyNote();
  }, [date, granularity, activeTopic, updateCurrentDailyNote]);

  useEffect(() => {
    if (!currentDailyNote) return;
    const promises: Promise<void>[] = [updateTasks(currentDailyNote)];
    if (dateFilter === "today") {
      promises.push(updatePosts(currentDailyNote));
    }
    Promise.all(promises);
  }, [currentDailyNote, updatePosts, updateTasks, dateFilter]);

  // 複数日モードのデータロード
  useEffect(() => {
    if (granularity !== "day" || asTask) return;
    if (dateFilter === "this_week") {
      updatePostsForWeek(activeTopic).then((paths) => {
        weekNotePathsRef.current = paths;
      });
    } else if (
      dateFilter === "3d" ||
      dateFilter === "5d" ||
      dateFilter === "7d"
    ) {
      const days = parseInt(dateFilter);
      updatePostsForDays(activeTopic, days).then((paths) => {
        weekNotePathsRef.current = paths;
      });
    }
  }, [
    date,
    dateFilter,
    granularity,
    asTask,
    activeTopic,
    updatePostsForWeek,
    updatePostsForDays,
  ]);

  useNoteSync({
    date,
    granularity,
    topicId: activeTopic,
    currentDailyNote,
    weekNotePaths:
      dateFilter !== "today" ? weekNotePathsRef.current : undefined,
    setDate,
    setTasks,
    setPosts,
    updateCurrentDailyNote,
    updatePosts,
    updateTasks,
    onWeekNoteChanged:
      dateFilter !== "today"
        ? () => {
            if (dateFilter === "this_week") {
              updatePostsForWeek(activeTopic).then((paths) => {
                weekNotePathsRef.current = paths;
              });
            } else {
              const days = parseInt(dateFilter);
              updatePostsForDays(activeTopic, days).then((paths) => {
                weekNotePathsRef.current = paths;
              });
            }
          }
        : undefined,
  });

  const createNoteWithInsertAfter = async () => {
    const created = await createTopicNote(app, date, granularity, activeTopic);
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
    const currentInput = inputRef.current?.getValue() ?? input;

    if (editingPost) {
      if (editingPost.path) {
        const path = editingPost.path;
        let targetTs = editingPost.timestamp;
        const now = window.moment();
        if (settings.updateDateStrategy === "always") {
          targetTs = now;
        } else if (settings.updateDateStrategy === "same_day") {
          if (editingPost.timestamp.isSame(now, "day")) {
            targetTs = now;
          }
        }
        const text = toText(
          currentInput,
          false,
          postFormat,
          granularity,
          targetTs,
        );
        await appHelper.replaceRange(
          path,
          editingPost.startOffset,
          editingPost.endOffset,
          text,
        );
        cancelEdit();
        // 更新対象のノートを再読込
        const noteFile = app.vault.getAbstractFileByPath(path);
        if (noteFile instanceof TFile) {
          if (dateFilter === "today") {
            await updatePosts(noteFile);
          } else if (dateFilter === "this_week") {
            await updatePostsForWeek(activeTopic);
          } else {
            await updatePostsForDays(activeTopic, parseInt(dateFilter));
          }
        }
        return;
      }
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
      if (dateFilter !== "today") {
        const updateFn =
          dateFilter === "this_week"
            ? () => updatePostsForWeek(activeTopic)
            : () => updatePostsForDays(activeTopic, parseInt(dateFilter));
        updateFn().then((paths) => {
          weekNotePathsRef.current = paths;
        });
      }
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
    updatePostsForDays,
    createNoteWithInsertAfter,
    cancelEdit,
    setInput,
    setDate,
    dateFilter,
  ]);

  const deletePost = useCallback(
    async (post: Post) => {
      if (isReadOnly) {
        new Notice("過去のノートの投稿は削除できません");
        return;
      }
      const path = post.path;
      const origin = await appHelper.loadFile(path);
      let start = post.startOffset;
      let end = post.endOffset;
      if (origin.slice(end, end + 1) === "\n") end += 1;
      await appHelper.replaceRange(path, start, end, "");
      let newContent = await appHelper.loadFile(path);
      newContent = newContent.replace(/\n{4,}/g, "\n\n\n");
      await app.vault.adapter.write(path, newContent);
      if (editingPost?.startOffset === post.startOffset && editingPost?.path === post.path) cancelEdit();
      
      if (dateFilter === "today") {
        const noteFile = app.vault.getAbstractFileByPath(path);
        if (noteFile instanceof TFile) await updatePosts(noteFile);
      } else if (dateFilter === "this_week") {
        await updatePostsForWeek(activeTopic);
      } else {
        await updatePostsForDays(activeTopic, parseInt(dateFilter));
      }
    },
    [
      app.vault,
      appHelper,
      editingPost,
      cancelEdit,
      updatePosts,
      updatePostsForWeek,
      updatePostsForDays,
      activeTopic,
      dateFilter,
      isReadOnly,
    ],
  );

  const movePostToTomorrow = useCallback(
    async (post: Post) => {
      if (isReadOnly) {
        new Notice("過去のノートの投稿は移動できません");
        return;
      }

      const nextDay = post.timestamp.clone().add(1, "day");
      const nextNote = await createTopicNote(
        app,
        nextDay,
        granularity,
        activeTopic,
      );
      if (!nextNote) {
        new Notice("明日のノートが見つかりませんでした");
        return;
      }

      const text = toText(post.message, false, postFormat, granularity, nextDay);
      await appHelper.insertTextAfter(
        nextNote,
        `\n${text}`,
        settings.insertAfter,
      );

      await deletePost(post);
      new Notice("明日に送りました");
    },
    [
      app,
      appHelper,
      deletePost,
      isReadOnly,
      granularity,
      activeTopic,
      postFormat,
      settings.insertAfter,
    ],
  );


  const handleClickTime = useCallback(
    (post: Post) => {
      (async () => {
        const path = post.path;
        const noteFile = app.vault.getAbstractFileByPath(path);
        if (!(noteFile instanceof TFile)) return;
        const leaf = app.workspace.getLeaf(true);
        await app.workspace.revealLeaf(leaf);
        await leaf.openFile(noteFile, { active: true });
        const editor = app.workspace.activeEditor!;
        const startPos = editor.editor!.offsetToPos(post.bodyStartOffset);
        const endPos = editor.editor!.offsetToPos(
          post.bodyStartOffset + post.message.length,
        );
        const from = { line: startPos.line, ch: startPos.ch };
        const to = { line: endPos.line, ch: endPos.ch };
        queueMicrotask(() => {
          // @ts-expect-error
          editor.editMode!.highlightSearchMatches([{ from, to }]);
        });
      })();
    },
    [currentDailyNote, app.workspace],
  );

  const updateTaskChecked = useCallback(
    async (task: Task, checked: boolean) => {
      if (isReadOnly) {
        new Notice("過去のノートのタスクは変更できません");
        return;
      }
      if (!currentDailyNote) return;
      const mark = checked ? "x" : " ";
      setTasks(
        tasks.map((x) => (x.offset === task.offset ? { ...x, mark } : x)),
      );
      await appHelper.setCheckMark(currentDailyNote.path, mark, task.offset);
    },
    [currentDailyNote, tasks, setTasks, appHelper, isReadOnly],
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
    if (isReadOnly) {
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
        item.setTitle("タスクにジャンプ").onClick(() => openTaskInEditor(task)),
      );
      menu.addItem((item) =>
        item.setTitle("編集").onClick(() => openTaskInEditor(task)),
      );
      menu.addItem((item) =>
        item
          .setTitle("削除")
          .setDisabled(isReadOnly)
          .onClick(() => {
            new DeleteConfirmModal(app, () => deleteTask(task)).open();
          }),
      );
      menu.showAtMouseEvent(e as unknown as MouseEvent);
    },
    [app, openTaskInEditor, deleteTask, isReadOnly],
  );

  const filteredPosts = useMemo(() => {
    if (dateFilter !== "today") return posts;
    if (timeFilter === "all" || asTask || granularity !== "day") return posts;
    if (timeFilter === "latest") return posts.length > 0 ? [posts[0]] : [];

    // "1h", "2h" などの文字列から数値を抽出
    const hours = parseInt(timeFilter as string);
    if (isNaN(hours)) return posts;

    const now = window.moment();
    return posts.filter((p) => now.diff(p.timestamp, "hours") < hours);
  }, [posts, timeFilter, dateFilter, asTask, granularity]);

  return {
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
    dateFilter,
    setDateFilter,
    sidebarOpen,
    setSidebarOpen,
    posts,
    setPosts,
    filteredPosts,
    tasks,
    setTasks,
    canSubmit,
    inputRef,
    scrollContainerRef,
    handleChangeCalendarDate,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickToday,
    handleClickOpenDailyNote,
    handleSubmit,
    startEdit,
    cancelEdit,
    deletePost,
    movePostToTomorrow,

    handleClickTime,
    updateTaskChecked,
    openTaskInEditor,
    deleteTask,
    taskContextMenu,
    isToday,
    isReadOnly,
    getMoveStep,
  };
}
