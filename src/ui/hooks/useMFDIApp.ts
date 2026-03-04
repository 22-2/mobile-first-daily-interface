import { App, Menu, Notice, TFile } from "obsidian";
import {
    ChangeEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { AppHelper, Task } from "../../app-helper";
import { postFormatMap, Settings } from "../../settings";
import { MFDIStorage } from "../../utils/storage";
import { DeleteConfirmModal } from "../DeleteConfirmModal";
import { granularityConfig } from "../granularity-config";
import { toText } from "../post-utils";
import { createTopicNote, getTopicNote } from "../topic-note";
import { Granularity, Post, TimeFilter } from "../types";
import { MFDIView } from "../MFDIView";
import { ObsidianLiveEditorRef } from "../ObsidianLiveEditor";
import { useNoteSync } from "./useNoteSync";
import { usePostsAndTasks } from "./usePostsAndTasks";

interface UseMFDIAppOptions {
  app: App;
  settings: Settings;
  view: MFDIView;
}

export function useMFDIApp({ app, settings, view }: UseMFDIAppOptions) {
  const appHelper = useMemo(() => new AppHelper(app), [app]);
  const storage = useMemo(
    () => new MFDIStorage(appHelper.getAppId()),
    [appHelper]
  );

  const [activeTopic, setActiveTopic] = useState<string>(
    () => settings.activeTopic ?? ""
  );

  const [granularity, setGranularity] = useState<Granularity>(() => {
    const savedOffset = storage.get<number | null>("editingPostOffset", null);
    if (savedOffset !== null) {
      return storage.get<Granularity>("editingPostGranularity", "day");
    }
    return storage.get<Granularity>("granularity", "day");
  });

  const [date, setDate] = useState(() => {
    const savedOffset = storage.get<number | null>("editingPostOffset", null);
    let saved = null;
    if (savedOffset !== null) {
      saved = storage.get<string | null>("editingPostDate", null);
    } else {
      saved = storage.get<string | null>("date", null);
    }
    const m = saved ? window.moment(saved) : window.moment();
    return m.isValid() ? m : window.moment();
  });

  const [currentDailyNote, setCurrentDailyNote] = useState<TFile | null>(null);
  const [input, setInput] = useState(() => storage.get<string>("input", ""));
  const [asTask, setAsTask] = useState<boolean>(
    () => storage.get<boolean>("asTask", false)
  );
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingPostOffset, setEditingPostOffset] = useState<number | null>(
    () => storage.get<number | null>("editingPostOffset", null)
  );
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(
    () => storage.get<TimeFilter>("timeFilter", "all")
  );

  const inputRef = useRef<ObsidianLiveEditorRef>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const postFormat = postFormatMap[settings.postFormatOption];

  const canSubmit = useMemo(() => {
    if (!editingPost) {
      return input.trim().length > 0;
    }
    return input !== editingPost.message;
  }, [input, editingPost]);

  const { posts, tasks, setPosts, setTasks, updatePosts, updateTasks } =
    usePostsAndTasks({ appHelper, postFormat, date, granularity });

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
      // プラグイン側に保存を要求
      view.onTopicSaveRequested?.(topicId);
    },
    [activeTopic, view]
  );

  useEffect(() => {
    updateCurrentDailyNote();
  }, [date, granularity, activeTopic, updateCurrentDailyNote]);

  useEffect(() => {
    if (!currentDailyNote) return;
    Promise.all([updatePosts(currentDailyNote), updateTasks(currentDailyNote)]);
  }, [currentDailyNote]);

  useNoteSync({
    app,
    date,
    granularity,
    topicId: activeTopic,
    currentDailyNote,
    setDate,
    setTasks,
    setPosts,
    updateCurrentDailyNote,
    updatePosts,
    updateTasks,
  });

  const handleChangeCalendarDate = (event: ChangeEvent<HTMLInputElement>) => {
    setDate(granularityConfig[granularity].parseInput(event.target.value));
  };

  const handleClickMovePrevious = () => {
    setDate(date.clone().subtract(1, granularityConfig[granularity].unit));
  };

  const handleClickMoveNext = () => {
    setDate(date.clone().add(1, granularityConfig[granularity].unit));
  };

  const handleClickToday = () => {
    setDate(window.moment());
  };

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
      const text = toText(input, false, postFormat, granularity, targetTs);
      await appHelper.replaceRange(
        path,
        editingPost.startOffset,
        editingPost.endOffset,
        text
      );
      setEditingPost(null);
      setEditingPostOffset(null);
      storage.remove("editingPostDate");
      storage.remove("editingPostGranularity");
      setInput("");
      await updatePosts(currentDailyNote);
      return;
    }

    const text = toText(input, asTask, postFormat, granularity);
    if (!currentDailyNote) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      await createNoteWithInsertAfter();
      setDate(date.clone());
    }
    const note = getTopicNote(app, date, granularity, activeTopic);
    if (note) {
      await appHelper.insertTextAfter(note, `\n${text}`, settings.insertAfter);
    }
    setInput("");
    if (settings.reverseOrder) {
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
      });
    } else {
      scrollContainerRef.current?.scrollTo({ top: 0 });
    }
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
    storage,
    activeTopic,
    updatePosts,
    createNoteWithInsertAfter,
  ]);

  const startEdit = (post: Post) => {
    setAsTask(false);
    setEditingPost(post);
    setEditingPostOffset(post.startOffset);
    storage.set("editingPostDate", date.toISOString());
    storage.set("editingPostGranularity", granularity);
    setInput(post.message);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const cancelEdit = () => {
    setEditingPost(null);
    setEditingPostOffset(null);
    storage.remove("editingPostDate");
    storage.remove("editingPostGranularity");
    setInput("");
  };

  const deletePost = async (post: Post) => {
    if (!currentDailyNote) return;
    const path = currentDailyNote.path;
    const origin = await appHelper.loadFile(path);
    let start = post.startOffset;
    let end = post.endOffset;
    if (origin.slice(end, end + 1) === "\n") end += 1;
    if (post.kind === "header" && origin.slice(start - 1, start) === "\n")
      start -= 1;
    await appHelper.replaceRange(path, start, end, "");
    let newContent = await appHelper.loadFile(path);
    newContent = newContent.replace(/\n{4,}/g, "\n\n\n");
    await app.vault.adapter.write(path, newContent);
    if (editingPost?.startOffset === post.startOffset) cancelEdit();
    await updatePosts(currentDailyNote);
  };

  const handleClickTime = (post: Post) => {
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
  };

  const updateTaskChecked = async (task: Task, checked: boolean) => {
    if (!currentDailyNote) return;
    const mark = checked ? "x" : " ";
    setTasks(tasks.map((x) => (x.offset === task.offset ? { ...x, mark } : x)));
    await appHelper.setCheckMark(currentDailyNote.path, mark, task.offset);
  };

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

  const taskContextMenu = (task: Task, e: React.MouseEvent) => {
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
      item.setTitle("削除").onClick(() => {
        new DeleteConfirmModal(app, () => deleteTask(task)).open();
      })
    );
    menu.showAtMouseEvent(e as unknown as MouseEvent);
  };

  // ────────────────────────────────────────────────────────────
  // Storage Persistence
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    storage.set("granularity", granularity);
  }, [granularity, storage]);

  useEffect(() => {
    storage.set("date", date.toISOString());
  }, [date, storage]);

  useEffect(() => {
    storage.set("asTask", asTask);
  }, [asTask, storage]);

  useEffect(() => {
    storage.set("timeFilter", timeFilter);
  }, [timeFilter, storage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      storage.set("input", input);
    }, 500);
    return () => clearTimeout(timer);
  }, [input, storage]);

  useEffect(() => {
    storage.set("editingPostOffset", editingPostOffset);
    if (editingPostOffset !== null) {
      storage.set("editingPostDate", date.toISOString());
      storage.set("editingPostGranularity", granularity);
    }
  }, [editingPostOffset, date, granularity, storage]);

  useEffect(() => {
    if (editingPostOffset !== null) {
      const found = posts.find((p) => p.startOffset === editingPostOffset);
      if (found) {
        setEditingPost(found);
      } else if (posts.length > 0) {
        setEditingPost(null);
        setEditingPostOffset(null);
      }
    } else {
      setEditingPost(null);
    }
  }, [posts, editingPostOffset]);

  const filteredPosts = useMemo(() => {
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
  };
}
