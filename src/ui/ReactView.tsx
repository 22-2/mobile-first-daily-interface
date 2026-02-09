import * as React from "react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Flex, HStack, Input, Textarea } from "@chakra-ui/react";
import { App, Notice, TFile, Menu, Modal } from "obsidian";
import { AppHelper, Task } from "../app-helper";
import { sorter } from "../utils/collections";
import {
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
  getDailyNoteSettings,
} from "obsidian-daily-notes-interface";
import {
  ChatIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { PostCardView } from "./PostCardView";
import { TaskView } from "./TaskView";
import { replaceDayToJa } from "../utils/strings";
import { PostFormat, Settings, postFormatMap } from "../settings";
import { parseThinoEntries } from "../utils/thino";
import { formatTaskText } from "../utils/task-text";

type MomentLike = ReturnType<typeof window.moment>;

class DeleteConfirmModal extends Modal {
  onConfirm: () => Promise<void>;

  constructor(app: App, onConfirm: () => Promise<void>) {
    super(app);
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "削除確認" });
    contentEl.createEl("p", { text: "この投稿を削除しますか？" });

    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "10px";
    buttonContainer.style.marginTop = "20px";
    buttonContainer.style.justifyContent = "flex-end";

    buttonContainer
      .createEl("button", { text: "キャンセル" })
      .addEventListener("click", () => {
        this.close();
      });

    const deleteButton = buttonContainer.createEl("button", { text: "削除" });
    deleteButton.style.color = "var(--text-error)";
    deleteButton.addEventListener("click", async () => {
      await this.onConfirm();
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export interface Post {
  timestamp: MomentLike;
  message: string;
  offset: number;
  startOffset: number;
  endOffset: number;
  bodyStartOffset: number;
  kind: "codeblock" | "header" | "thino";
}

function toText(
  input: string,
  asTask: boolean,
  postFormat: PostFormat
): string {
  if (asTask) {
    return formatTaskText(input);
  }

  const ts = window.moment().toISOString(true);

  if (postFormat.type === "thino") {
    const time = window.moment().format("HH:mm:ss");
    const body = input
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((x) => (x.length === 0 ? "" : `    ${x}`))
      .join("\n");

    return `
- ${time}
${body}
`;
  }

  if (postFormat.type === "codeblock") {
    return `
\`\`\`\`fw ${ts}
${input}
\`\`\`\`
`;
  }

  return `
${"#".repeat(postFormat.level)} ${ts}

${input}
`;
}

export const ReactView = ({
  app,
  settings,
}: {
  app: App;
  settings: Settings;
}) => {
  const appHelper = useMemo(() => new AppHelper(app), [app]);

  const [date, setDate] = useState<MomentLike>(window.moment());
  // デイリーノートが存在しないとnull
  const [currentDailyNote, setCurrentDailyNote] = useState<TFile | null>(null);
  const [input, setInput] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [asTask, setAsTask] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const canSubmit = useMemo(() => {
    if (!editingPost) {
      return input.trim().length > 0;
    }
    // When editing, disable update button if content hasn't changed.
    return input !== editingPost.message;
  }, [input, editingPost]);

  const updateCurrentDailyNote = () => {
    const n = getDailyNote(date, getAllDailyNotes()) as TFile | null;
    if (n?.path !== currentDailyNote?.path) {
      setCurrentDailyNote(n);
    }
  };

  useEffect(() => {
    updateCurrentDailyNote();
  }, [date]);

  useEffect(() => {
    if (!currentDailyNote) {
      return;
    }

    Promise.all([updatePosts(currentDailyNote), updateTasks(currentDailyNote)]);
  }, [currentDailyNote]);

  const postFormat = postFormatMap[settings.postFormatOption];

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

    const text = toText(input, asTask, postFormat);

    if (!currentDailyNote) {
      new Notice("デイリーノートが存在しなかったので新しく作成しました");
      await createDailyNote(date);
      // 再読み込みをするためにクローンを入れて参照を更新
      setDate(date.clone());
    }

    // デイリーノートがなくてif文に入った場合、setDateからのuseMemoが間に合わずcurrentDailyNoteの値が更新されないので、意図的に同じ処理を呼び出す
    await appHelper.insertTextAfter(
      getDailyNote(date, getAllDailyNotes()),
      text,
      settings.insertAfter
    );
    setInput("");
  };

  const updatePosts = async (note: TFile) => {
    const _posts: Post[] =
      postFormat.type === "thino"
        ? parseThinoEntries(await appHelper.loadFile(note.path)).map((x) => ({
            timestamp: window.moment(
              `${date.format("YYYY-MM-DD")} ${x.time}`,
              "YYYY-MM-DD HH:mm:ss"
            ),
            message: x.message,
            offset: x.offset,
            startOffset: x.startOffset,
            endOffset: x.endOffset,
            bodyStartOffset: x.bodyStartOffset,
            kind: "thino" as const,
          }))
        : postFormat.type === "codeblock"
          ? ((await appHelper.getCodeBlocks(note)) ?? [])
              ?.filter((x) => x.lang === "fw")
              .map((x) => ({
                timestamp: window.moment(x.meta),
                message: x.code,
                offset: x.offset,
                startOffset: x.offset,
                endOffset: x.endOffset,
                bodyStartOffset: x.codeStartOffset,
                kind: "codeblock" as const,
              }))
          : ((await appHelper.getHeaders(note, postFormat.level)) ?? [])
              .filter((x) => window.moment(x.title).isValid())
              .map((x) => ({
                timestamp: window.moment(x.title),
                message: x.body.replace(/^\n+/g, "").replace(/\n+$/g, ""),
                offset: x.titleOffset,
                startOffset: x.titleOffset,
                endOffset: x.endOffset,
                bodyStartOffset: x.bodyStartOffset,
                kind: "header" as const,
              }));

    setPosts(_posts.sort(sorter((x) => x.timestamp.unix(), "desc")));
  };

  const updateTasks = async (note: TFile) => {
    setTasks((await appHelper.getTasks(note)) ?? []);
  };

  const handleClickOpenDailyNote = async () => {
    if (!currentDailyNote) {
      new Notice("デイリーノートが存在しなかったので新しく作成しました");
      await createDailyNote(date);
      // 再読み込みをするためにクローンを入れて参照を更新
      setDate(date.clone());
    }

    // デイリーノートがなくてif文に入った場合、setDateからのuseMemoが間に合わずcurrentDailyNoteの値が更新されないので、意図的に同じ処理を呼び出す
    await app.workspace
      .getLeaf(true)
      .openFile(getDailyNote(date, getAllDailyNotes()));
  };
  const handleChangeCalendarDate = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    setDate(window.moment(event.target.value));
  };
  const handleClickMovePrevious = () => {
    setDate(date.clone().subtract(1, "day"));
  };
  const handleClickMoveNext = async () => {
    setDate(date.clone().add(1, "day"));
  };
  const handleClickToday = async () => {
    setDate(window.moment());
  };

  const handleKeyUp = (event: React.KeyboardEvent) => {
    if (event.ctrlKey && event.key === "Enter") {
      handleSubmit();
      event.preventDefault();
    }
  };

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
        editor.editMode!.highlightSearchMatches([{from, to}]);
      });
    })();
  };

  useEffect(() => {
    const eventRef = app.metadataCache.on(
      "changed",
      async (file, _data, _cache) => {
        // currentDailyNoteが存在してパスが異なるなら、違う日なので更新は不要
        if (currentDailyNote != null && file.path !== currentDailyNote.path) {
          return;
        }

        if (currentDailyNote == null) {
          const ds = getDailyNoteSettings();
          const dir = ds.folder ? `${ds.folder}/` : "";
          const entry = date.format(ds.format);
          // 更新されたファイルがcurrentDailyNoteになるべきファイルではなければ処理は不要
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
  }, [date, currentDailyNote]);

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

    // If this is a header and there is a leading newline (ReactView's toText inserts one),
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

  const openTaskInEditor = (task: Task) => {
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

  const deleteTask = async (task: Task) => {
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

  const updateTaskChecked = async (task: Task, checked: boolean) => {
    if (!currentDailyNote) {
      return;
    }

    const mark = checked ? "x" : " ";
    setTasks(tasks.map((x) => (x.offset === task.offset ? { ...x, mark } : x)));
    await appHelper.setCheckMark(currentDailyNote.path, mark, task.offset);
  };

  const contents = useMemo(
    () =>
      asTask ? (
        <>
          {tasks.filter((x) => x.mark === " ").length > 0 && (
              <TransitionGroup className="list">
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
                          onContextMenu={(task, e) => {
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
                          }}
                        />
                      </Box>
                    </CSSTransition>
                  ))}
              </TransitionGroup>
          )}
          {tasks.filter((x) => x.mark !== " ").length > 0 && (
              <TransitionGroup className="list">
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
                          onContextMenu={(task, e) => {
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
                          }}
                        />
                      </Box>
                    </CSSTransition>
                  ))}
              </TransitionGroup>
          )}
        </>
      ) : (
        <TransitionGroup className="list">
          {posts.map((x) => (
            <CSSTransition
              key={x.timestamp.unix()}
              timeout={300}
              classNames="item"
            >
              <PostCardView
                post={x}
                settings={settings}
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

  return (
    <Flex
      flexDirection="column"
      gap="0.75rem"
      height="95%"
      // maxWidth="30rem"
      position={"relative"}
    >
      <HStack justify="center">
        <ChevronLeftIcon
          boxSize="1.5em"
          cursor="pointer"
          onClick={handleClickMovePrevious}
        />
        <Box textAlign={"center"}>
          <Button
            marginRight={"0.3em"}
            fontSize={"80%"}
            width="3em"
            height="2em"
            cursor="pointer"
            onClick={handleClickToday}
          >
            今日
          </Button>
          <Input
            size="md"
            type="date"
            value={date.format("YYYY-MM-DD")}
            onChange={handleChangeCalendarDate}
            width={"9em"}
          />
          <Box as="span" marginLeft={"0.2em"} fontSize={"95%"}>
            {replaceDayToJa(date.format("(ddd)"))}
          </Box>
        </Box>
        <ChevronRightIcon
          boxSize="1.5em"
          cursor="pointer"
          onClick={handleClickMoveNext}
        />
      </HStack>
      <Box position="absolute" right={0}>
        <ExternalLinkIcon
          boxSize="1.25em"
          cursor="pointer"
          onClick={handleClickOpenDailyNote}
        />
      </Box>

      <Textarea
        placeholder={asTask ? "タスクを入力" : "思ったことなどを記入"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        minHeight={"8em"}
        resize="vertical"
        onKeyUp={handleKeyUp}
        ref={inputRef}
      />
      <HStack>
        <Button
          disabled={!canSubmit}
          className={canSubmit ? "mod-cta" : ""}
          minHeight={"2.4em"}
          maxHeight={"2.4em"}
          flexGrow={1}
          cursor={canSubmit ? "pointer" : ""}
          onClick={handleSubmit}
        >
          {editingPost ? "更新" : asTask ? "タスク追加" : "投稿"}
        </Button>
        {editingPost ? (
          <Button
            minHeight={"2.4em"}
            maxHeight={"2.4em"}
            variant="ghost"
            onClick={cancelEdit}
          >
            キャンセル
          </Button>
        ) : (
          ""
        )}
        <Box
          display="flex"
          gap="0.5em"
          padding={4}
          marginRight={8}
          borderStyle={"solid"}
          borderRadius={"10px"}
          borderColor={"var(--table-border-color)"}
          borderWidth={"2px"}
          cursor={"pointer"}
          _hover={{
            borderColor: "var(--text-success)",
            transitionDuration: "0.5s",
          }}
          transitionDuration={"0.5s"}
          onClick={() => setAsTask(!asTask)}
        >
          <ChatIcon
            boxSize={"1.5em"}
            color={asTask ? "var(--text-faint)" : "var(--text-success)"}
            opacity={asTask ? 0.2 : 1}
          />
          <CheckCircleIcon
            boxSize={"1.5em"}
            color={asTask ? "var(--text-success)" : "var(--text-faint)"}
            opacity={asTask ? 1 : 0.2}
          />
        </Box>
      </HStack>

      <Box flexGrow={1} overflowY="scroll" overflowX="hidden">
        {currentDailyNote && contents}
      </Box>
    </Flex>
  );
};
