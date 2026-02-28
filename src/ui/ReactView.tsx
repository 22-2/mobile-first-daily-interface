import { Box, Button, Flex, HStack, Input } from "@chakra-ui/react";
import { App, Menu, Notice, TFile } from "obsidian";
import * as React from "react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { AppHelper } from "../app-helper";
import { postFormatMap, Settings } from "../settings";
import { replaceDayToJa } from "../utils/strings";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import {
    createNote, getAllNotes,
    getNote, granularityConfig
} from "./granularity-config";
import { useNoteSync } from "./hooks/useNoteSync";
import { usePostsAndTasks } from "./hooks/usePostsAndTasks";
import { ObsidianIcon } from "./ObsidianIcon";
import { ObsidianLiveEditor } from "./ObsidianLiveEditor";
import { toText } from "./post-utils";
import { PostCardView } from "./PostCardView";
import { TaskView } from "./TaskView";
import { Granularity, Post } from "./types";

export type { Post };

export const ReactView = ({
  app,
  settings,
  view,
}: {
  app: App;
  settings: Settings;
  view: any;
}) => {
  const appHelper = useMemo(() => new AppHelper(app), [app]);

  const [granularity, setGranularity] = useState<Granularity>("day");
  const [date, setDate] = useState(() => window.moment());
  // 対象ノートが存在しないとnull
  const [currentDailyNote, setCurrentDailyNote] = useState<TFile | null>(null);
  const LOCAL_STORAGE_KEY_INPUT = `mfdi-textarea-input-${(app as unknown as { appId: string }).appId}`;
  const [input, setInput] = useState(
    () => localStorage.getItem(LOCAL_STORAGE_KEY_INPUT) || ""
  );
  const [asTask, setAsTask] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const inputRef = useRef<any>(null); // Quick fix to avoid import recursion for interface or just use any/ObsidianLiveEditorRef
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const postFormat = postFormatMap[settings.postFormatOption];

  const canSubmit = useMemo(() => {
    if (!editingPost) {
      return input.trim().length > 0;
    }
    // When editing, disable update button if content hasn't changed.
    return input !== editingPost.message;
  }, [input, editingPost]);

  // ────────────────────────────────────────────────────────────
  // Posts & Tasks
  // ────────────────────────────────────────────────────────────
  const { posts, tasks, setPosts, setTasks, updatePosts, updateTasks } =
    usePostsAndTasks({ appHelper, postFormat, date, granularity });

  // ────────────────────────────────────────────────────────────
  // Current daily note resolution
  // ────────────────────────────────────────────────────────────
  const updateCurrentDailyNote = () => {
    const n = getNote(date, getAllNotes(granularity), granularity);
    if (n?.path !== currentDailyNote?.path) {
      setCurrentDailyNote(n);
    }
  };

  useEffect(() => {
    updateCurrentDailyNote();
  }, [date, granularity]);

  useEffect(() => {
    if (!currentDailyNote) {
      return;
    }
    Promise.all([updatePosts(currentDailyNote), updateTasks(currentDailyNote)]);
  }, [currentDailyNote]);

  // ────────────────────────────────────────────────────────────
  // Vault event sync
  // ────────────────────────────────────────────────────────────
  useNoteSync({
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
  });

  // ────────────────────────────────────────────────────────────
  // Handlers — date navigation
  // ────────────────────────────────────────────────────────────
  const handleChangeCalendarDate = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
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

  // ────────────────────────────────────────────────────────────
  // Helpers — create note with insertAfter header
  // ────────────────────────────────────────────────────────────
  /**
   * ノートを新規作成し、settings.insertAfter が設定されている場合は
   * その文字列がノート内にまだ存在しなければ末尾に追記する。
   */
  const createNoteWithInsertAfter = async () => {
    const created = await createNote(date, granularity);
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

  // ────────────────────────────────────────────────────────────
  // Handlers — open daily note
  // ────────────────────────────────────────────────────────────
  const handleClickOpenDailyNote = async () => {
    if (!currentDailyNote) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      await createNoteWithInsertAfter();
      // 再読み込みをするためにクローンを入れて参照を更新
      setDate(date.clone());
    }

    // ノートがなくてif文に入った場合、setDateからのuseMemoが間に合わずcurrentDailyNoteの値が更新されないので、意図的に同じ処理を呼び出す
    const note = getNote(date, getAllNotes(granularity), granularity);
    if (note) {
      await app.workspace.getLeaf(true).openFile(note);
    }
  };

  useEffect(() => {
    view.onOpenDailyNoteAction = handleClickOpenDailyNote;
    return () => {
      view.onOpenDailyNoteAction = undefined;
    };
  }, [view, handleClickOpenDailyNote]);

  // granularity を view に同期（paneMenu の setChecked / onChangeGranularity 用）
  useEffect(() => {
    view.granularity = granularity;
  }, [view, granularity]);

  useEffect(() => {
    view.onChangeGranularity = (g: Granularity) => {
      setGranularity(g);
      setCurrentDailyNote(null);
      setPosts([]);
      setTasks([]);
    };
    return () => {
      view.onChangeGranularity = undefined;
    };
  }, [view]);

  // asTask を view に同期
  useEffect(() => {
    view.asTask = asTask;
  }, [view, asTask]);

  useEffect(() => {
    view.onChangeAsTask = (t: boolean) => {
      setAsTask(t);
    };
    return () => {
      view.onChangeAsTask = undefined;
    };
  }, [view]);

  // ────────────────────────────────────────────────────────────
  // Initial scroll position
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentDailyNote || !scrollContainerRef.current) return;

    // 初期化時、少し待ってからスクロールを適用（DOMレンダリングを待つ）
    const timer = setTimeout(() => {
      if (settings.reverseOrder) {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
        });
      } else {
        scrollContainerRef.current?.scrollTo({ top: 0 });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [currentDailyNote, settings.reverseOrder]);

  // ────────────────────────────────────────────────────────────
  // Local storage persistence
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_INPUT, input);
  }, [input]);

  // ────────────────────────────────────────────────────────────
  // Handlers — input / submit
  // ────────────────────────────────────────────────────────────
  const handleKeyUp = (event: React.KeyboardEvent) => {
    if (event.ctrlKey && event.key === "Enter") {
      handleSubmit();
      event.preventDefault();
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    if (editingPost) {
      if (!currentDailyNote) {
        return;
      }

      const path = currentDailyNote.path;
      const origin = await appHelper.loadFile(path);
      const normalizedInput = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      if (editingPost.kind === "header") {
        const replacement = `\n${normalizedInput.replace(/\n+$/g, "")}\n`;
        await appHelper.replaceRange(
          path,
          editingPost.bodyStartOffset,
          editingPost.endOffset,
          replacement
        );
      } else if (editingPost.kind === "thino") {
        const body = normalizedInput
          .split("\n")
          .map((x) => (x.length === 0 ? "" : `    ${x}`))
          .join("\n");
        const replacement = body.length === 0 ? "" : `${body}\n`;
        await appHelper.replaceRange(
          path,
          editingPost.bodyStartOffset,
          editingPost.endOffset,
          replacement
        );
      } else {
        // codeblock: keep fence/meta lines, replace only code part.
        const block = origin.slice(editingPost.startOffset, editingPost.endOffset);
        const lines = block.split("\n");
        const firstLine = lines[0] ?? "";
        const lastLine = lines.length >= 2 ? lines[lines.length - 1] : "";
        const code = normalizedInput.replace(/\n+$/g, "");
        const replacement = `${firstLine}\n${code}\n${lastLine}`;
        await appHelper.replaceRange(
          path,
          editingPost.startOffset,
          editingPost.endOffset,
          replacement
        );
      }

      setEditingPost(null);
      setInput("");
      await updatePosts(currentDailyNote);
      return;
    }

    const text = toText(input, asTask, postFormat, granularity);

    if (!currentDailyNote) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      await createNoteWithInsertAfter();
      // 再読み込みをするためにクローンを入れて参照を更新
      setDate(date.clone());
    }

    // ノートがなくてif文に入った場合、setDateからのuseMemoが間に合わずcurrentDailyNoteの値が更新されないので、意図的に同じ処理を呼び出す
    const note = getNote(date, getAllNotes(granularity), granularity);
    if (note) {
      await appHelper.insertTextAfter(note, text, settings.insertAfter);
    }
    setInput("");

    // 投稿後にスクロールを調整
    if (settings.reverseOrder) {
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
      });
    } else {
      scrollContainerRef.current?.scrollTo({ top: 0 });
    }
  };

  // ────────────────────────────────────────────────────────────
  // Handlers — edit / delete post
  // ────────────────────────────────────────────────────────────
  const startEdit = (post: Post) => {
    setAsTask(false);
    setEditingPost(post);
    setInput(post.message);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const cancelEdit = () => {
    setEditingPost(null);
    setInput("");
  };

  const deletePost = async (post: Post) => {
    if (!currentDailyNote) {
      return;
    }

    const path = currentDailyNote.path;
    const origin = await appHelper.loadFile(path);
    let start = post.startOffset;
    let end = post.endOffset;

    // If there's a trailing newline, include it to avoid merging lines.
    if (origin.slice(end, end + 1) === "\n") {
      end += 1;
    }

    // If this is a header and there is a leading newline (toText inserts one),
    // remove it too when present.
    if (post.kind === "header" && origin.slice(start - 1, start) === "\n") {
      start -= 1;
    }

    await appHelper.replaceRange(path, start, end, "");

    // Clean up excessive newlines after deletion.
    let newContent = await appHelper.loadFile(path);
    newContent = newContent.replace(/\n{4,}/g, "\n\n\n");
    await app.vault.adapter.write(path, newContent);

    if (editingPost?.startOffset === post.startOffset) {
      cancelEdit();
    }
    await updatePosts(currentDailyNote);
  };

  // ────────────────────────────────────────────────────────────
  // Handlers — jump to post in editor
  // ────────────────────────────────────────────────────────────
  const handleClickTime = (post: Post) => {
    (async () => {
      if (!currentDailyNote) {
        return;
      }

      // TODO: 今後必要に応じてAppHelperにだす
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

  // ────────────────────────────────────────────────────────────
  // Handlers — tasks
  // ────────────────────────────────────────────────────────────
  const openTaskInEditor = (task: ReturnType<typeof tasks[number] extends infer T ? () => T : never>) => {
    (async () => {
      if (!currentDailyNote) {
        return;
      }

      const leaf = app.workspace.getLeaf(true);
      await leaf.openFile(currentDailyNote);

      const editor = appHelper.getActiveMarkdownEditor()!;
      const pos = editor.offsetToPos(task.offset);
      editor.setCursor(pos);
      await leaf.openFile(currentDailyNote, {
        eState: { line: pos.line },
      });
    })();
  };

  const deleteTask = async (task: ReturnType<typeof tasks[number] extends infer T ? () => T : never>) => {
    if (!currentDailyNote) {
      return;
    }

    const path = currentDailyNote.path;
    const origin = await appHelper.loadFile(path);

    // remove the line starting at task.offset
    let start = task.offset;
    // find end of line
    let end = origin.indexOf("\n", start);
    if (end === -1) {
      end = origin.length;
    } else {
      // include newline
      end = end + 1;
    }

    await appHelper.replaceRange(path, start, end, "");

    // cleanup excessive newlines
    let newContent = await appHelper.loadFile(path);
    newContent = newContent.replace(/\n{4,}/g, "\n\n\n");
    await app.vault.adapter.write(path, newContent);

    await updateTasks(currentDailyNote);
  };

  const updateTaskChecked = async (
    task: ReturnType<typeof tasks[number] extends infer T ? () => T : never>,
    checked: boolean
  ) => {
    if (!currentDailyNote) {
      return;
    }

    const mark = checked ? "x" : " ";
    setTasks(tasks.map((x) => (x.offset === task.offset ? { ...x, mark } : x)));
    await appHelper.setCheckMark(currentDailyNote.path, mark, task.offset);
  };

  // ────────────────────────────────────────────────────────────
  // Render helpers
  // ────────────────────────────────────────────────────────────
  const taskContextMenu = (
    task: ReturnType<typeof tasks[number] extends infer T ? () => T : never>,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const menu = new Menu();
    menu.addItem((item) =>
      item.setTitle("タスクにジャンプ").onClick(() => {
        openTaskInEditor(task);
      })
    );
    menu.addItem((item) =>
      item.setTitle("編集").onClick(() => {
        openTaskInEditor(task);
      })
    );
    menu.addItem((item) =>
      item
        .setTitle("削除")
        .onClick(() => {
          new DeleteConfirmModal(app, () => deleteTask(task)).open();
        })
    );
    menu.showAtMouseEvent(e as unknown as MouseEvent);
  };

  const emptyState = (
    <Flex
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      gap="var(--size-4-3)"
      color="var(--text-faint)"
      style={{ userSelect: "none", pointerEvents: "none" }}
    >
      <ObsidianIcon name="feather" boxSize="2.5em" opacity={0.35} />
      <Box fontSize="var(--font-ui-small)" opacity={0.6} textAlign="center">
        この{granularityConfig[granularity].label}の記録はまだありません
      </Box>
    </Flex>
  );

  const contents = useMemo(
    () =>
      asTask ? (
        <>
          {tasks.filter((x) => x.mark === " ").length > 0 && (
              <TransitionGroup className="list" style={{ padding: "var(--size-4-4) 0" }}>
                {tasks
                  .filter((x) => x.mark === " ")
                  .map((x) => (
                    <CSSTransition
                      key={date.format() + String(x.offset)}
                      timeout={300}
                      classNames="item"
                    >
                      <Box m={10}>
                        <TaskView
                          task={x}
                          onChange={(c) => updateTaskChecked(x, c)}
                          onContextMenu={(task, e) => taskContextMenu(task, e)}
                        />
                      </Box>
                    </CSSTransition>
                  ))}
              </TransitionGroup>
          )}
          {tasks.filter((x) => x.mark !== " ").length > 0 && (
              <TransitionGroup className="list" style={{ padding: "var(--size-4-4) 0" }}>
                {tasks
                  .filter((x) => x.mark !== " ")
                  .map((x) => (
                    <CSSTransition
                      key={date.format() + String(x.offset)}
                      timeout={300}
                      classNames="item"
                    >
                      <Box m={10}>
                        <TaskView
                          task={x}
                          onChange={(c) => updateTaskChecked(x, c)}
                          onContextMenu={(task, e) => taskContextMenu(task, e)}
                        />
                      </Box>
                    </CSSTransition>
                  ))}
              </TransitionGroup>
          )}
        </>
      ) : (
        <TransitionGroup className="list" style={{ padding: "var(--size-4-4) 0" }}>
          {posts.map((x) => (
            <CSSTransition
              key={x.timestamp.unix()}
              timeout={300}
              classNames="item"
            >
              <PostCardView
                post={x}
                settings={settings}
                granularity={granularity}
                onClickTime={handleClickTime}
                onEdit={startEdit}
                onContextMenu={(post, e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const menu = new Menu();
                  menu.addItem((item) =>
                    item.setTitle("投稿にジャンプ").onClick(() => {
                      handleClickTime(post);
                    })
                  );
                  menu.addItem((item) =>
                    item.setTitle("編集").onClick(() => {
                      startEdit(post);
                    })
                  );
                  menu.addItem((item) =>
                    item.setTitle("コピー").onClick(async () => {
                      await navigator.clipboard.writeText(post.message);
                      new Notice("copied");
                    })
                  );
                  menu.addItem((item) =>
                    item
                      .setTitle("削除")
                      .onClick(() => {
                        new DeleteConfirmModal(app, () => deletePost(post)).open();
                      })
                  );
                  menu.showAtMouseEvent(e as unknown as MouseEvent);
                }}
              />
            </CSSTransition>
          ))}
        </TransitionGroup>
      ),
    [posts, tasks, asTask, editingPost]
  );

  // 投稿もタスクもない（ノートがない、またはノートはあるが空）かどうか
  const isEmpty = !currentDailyNote || (asTask ? tasks.length === 0 : posts.length === 0);

  // ────────────────────────────────────────────────────────────
  // JSX helpers
  // ────────────────────────────────────────────────────────────
    const isToday = date.isSame(
      window.moment(),
      granularityConfig[granularity].unit
    );

    const inputArea = (
      <Flex
        flexDirection="column"
        className="mfdi-input-area"
        borderRadius="22px 22px 0 0"
        margin={0}
        marginRight="var(--size-4-3)"
        padding={0}
        backgroundColor="var(--background-secondary)"
        border="1px solid var(--table-border-color)"
      >
        <HStack justify="center">
          <ObsidianIcon
            name="chevron-left"
            boxSize="1.5em"
            cursor="pointer"
            onClick={handleClickMovePrevious}
          />

          <Box textAlign={"center"} marginY={"1em"}>
            <Button
              marginRight={"0.3em"}
              fontSize={"80%"}
              width="3em"
              height="2em"
              cursor="pointer"
              onClick={handleClickToday}
              bg={
                !isToday
                  ? "var(--color-accent)!important;"
                  : "var(--background-modifier-border)"
              }
              color={!isToday ? "var(--text-on-accent)" : "var(--text-muted)"}
              _hover={{
                bg: !isToday
                  ? "var(--color-accent-2)"
                  : "var(--background-modifier-border)",
              }}
            >
              {granularityConfig[granularity].todayLabel}
            </Button>
          <Input
            size="md"
            type={granularityConfig[granularity].inputType}
            value={date.format(granularityConfig[granularity].inputFormat)}
            onChange={handleChangeCalendarDate}
            width={granularity === "year" ? "5.5em" : "9em"}
          />
          {granularityConfig[granularity].showWeekday && (
            <Box as="span" marginLeft={"0.2em"} fontSize={"95%"}>
              {replaceDayToJa(date.format("(ddd)"))}
            </Box>
          )}
        </Box>
        <ObsidianIcon
          name="chevron-right"
          boxSize="1.5em"
          cursor="pointer"
          onClick={handleClickMoveNext}
        />
      </HStack>


      <ObsidianLiveEditor
        ref={inputRef}
        leaf={view.leaf}
        app={app}
        value={input}
        onChange={setInput}
        minHeight="var(--size-4-18)"
        marginX="var(--size-4-4)"
        onKeyUp={handleKeyUp}
      />

      <HStack justify="flex-end">
        {editingPost && (
          <Button
            minHeight={"2.4em"}
            maxHeight={"2.4em"}
            variant="ghost"
            onClick={cancelEdit}
          >
            キャンセル
          </Button>
        )}
        <Button
          disabled={!canSubmit}
          bg={canSubmit ? "var(--color-accent)!important;" : "var(--background-modifier-border)"}
          color={canSubmit ? "var(--text-on-accent)" : "var(--text-muted)"}
          _hover={{
            bg: canSubmit ? "var(--color-accent-2)" : "var(--background-modifier-border)",
          }}
          marginRight={"2.4em"}
          marginTop={"0.5em"}
          marginBottom={"1em"}
          minHeight={"2.4em"}
          maxHeight={"2.4em"}
          cursor={canSubmit ? "pointer" : ""}
          onClick={handleSubmit}
        >
          {editingPost ? "更新" : asTask ? "タスク追加" : "投稿"}
        </Button>
      </HStack>
    </Flex>
  );

  // ────────────────────────────────────────────────────────────
  // JSX
  // ────────────────────────────────────────────────────────────
  return (
    <Flex
      flexDirection="column"
      height="100%"
      className="root"
      position="relative"
      backgroundColor="transparent"
      marginX="var(--size-4-2)"
    >
      {!settings.reverseOrder && inputArea}

      <Box
        className="mfdi-scroll-container"
        flexGrow={1}
        overflowY="scroll"
        overflowX="hidden"
        display="flex"
        flexDirection={settings.reverseOrder ? "column-reverse" : "column"}
        ref={scrollContainerRef}
      >
        {isEmpty ? emptyState : contents}
      </Box>

      {settings.reverseOrder && inputArea}
    </Flex>
  );
};
