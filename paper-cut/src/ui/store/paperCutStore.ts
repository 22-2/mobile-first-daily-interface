import { resolveTimestamp, toText } from "src/core/post-utils";
import { parseThinoEntries } from "src/core/thino";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import type { Post } from "src/ui/types";
import {
  buildPostFromEntry,
  resolvePostId,
} from "src/ui/utils/thread-utils";
import { createStore } from "zustand/vanilla";

export interface PaperCutState {
  shell: ObsidianAppShell | null;
  filePath: string | null;
  posts: Post[];
  sidebarOpen: boolean;
  // 現在ポップアウト編集中のポスト
  editingPost: Post | null;

  initialize: (shell: ObsidianAppShell, filePath: string) => Promise<void>;
  loadPosts: () => Promise<void>;
  addPost: (message: string) => Promise<void>;
  reorderPosts: (fromIndex: number, toIndex: number) => Promise<void>;
  updatePost: (post: Post, newMessage: string) => Promise<void>;
  deletePost: (post: Post) => Promise<void>;

  setSidebarOpen: (open: boolean) => void;
  setEditingPost: (post: Post | null) => void;
  setFilePath: (filePath: string) => void;
}

// Paper Cut の固定ノートは daily note ではないため、
// noteDate として「今日」を使う。これにより isDimmed が常に false になる。
const resolveNoteDate = () => window.moment();

// ThinoEntry → Post への変換。Paper Cut 向けに noteDate を現在日時で固定する。
function buildPost(
  entry: ReturnType<typeof parseThinoEntries>[number],
  path: string,
): Post {
  return buildPostFromEntry({
    ...entry,
    path,
    noteDate: resolveNoteDate(),
    resolveTimestamp,
  });
}

// ファイルに ## Thino セクションが存在しない場合に追記するテキスト
const THINO_SECTION_HEADER = "## Thino\n";

// ## Thino セクションが存在するかチェックし、なければ末尾に追加して返す
function ensureThinoSection(content: string): string {
  if (/^#{1,6}\s+thino\s*$/im.test(content)) {
    return content;
  }
  // 末尾に改行を挟んでセクションを追加する
  const trimmed = content.trimEnd();
  return trimmed.length > 0
    ? `${trimmed}\n\n${THINO_SECTION_HEADER}`
    : THINO_SECTION_HEADER;
}

export function createPaperCutStore() {
  return createStore<PaperCutState>()((set, get) => ({
    shell: null,
    filePath: null,
    posts: [],
    sidebarOpen: false,
    editingPost: null,

    async initialize(shell, filePath) {
      set({ shell, filePath });
      await get().loadPosts();
    },

    async loadPosts() {
      const { shell, filePath } = get();
      if (!shell || !filePath) return;

      const content = await shell.loadFile(filePath);
      const entries = parseThinoEntries(content);
      const posts = entries.map((entry) => buildPost(entry, filePath));
      set({ posts });
    },

    async addPost(message) {
      // 空白のみのメッセージは Thino エントリとして解析されないため弾く
      if (!message.trim()) return;

      const { shell, filePath } = get();
      if (!shell || !filePath) return;

      let content = await shell.loadFile(filePath);
      content = ensureThinoSection(content);

      // 新しいエントリをファイル末尾に追記する（単一ノートなので day 粒度で時刻のみ）
      const entryText = toText(message, false, "day");
      // 末尾の改行を確認して1行以内の空行に正規化してから追記する
      const base = content.endsWith("\n") ? content : content + "\n";
      await shell.writeFile(filePath, base + entryText);

      // 意図: loadPosts() を React クリックハンドラの呼び出しスタック内で await すると、
      //        preact が Obsidian の read-only な DOM プロパティ（previousSibling 等）に
      //        書き込もうとして TypeError が発生する。
      //        vault.on('modify') ウォッチャーが非同期でリロードするため、
      //        ここでは次の event loop ティックへ逃がすだけでよい。
      setTimeout(() => void get().loadPosts(), 0);
    },

    async reorderPosts(fromIndex, toIndex) {
      if (fromIndex === toIndex) return;
      const { shell, filePath, posts } = get();
      if (!shell || !filePath) return;

      const content = await shell.loadFile(filePath);
      const entries = parseThinoEntries(content);
      if (entries.length !== posts.length) {
        // ファイルと状態がずれている場合は再読み込みして終了する
        await get().loadPosts();
        return;
      }

      // 各エントリのテキスト（startOffset ～ endOffset）をそのまま切り出す
      const entryTexts = entries.map((e) =>
        content.slice(e.startOffset, e.endOffset),
      );

      // 先頭エントリより前のテキスト（frontmatter・見出し等）は保持する
      const preamble = entries.length > 0
        ? content.slice(0, entries[0].startOffset)
        : content;

      // 配列を複製してから移動する
      const reordered = [...entryTexts];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      const newContent = preamble + reordered.join("");
      await shell.writeFile(filePath, newContent);
      setTimeout(() => void get().loadPosts(), 0);
    },

    async updatePost(post, newMessage) {
      const { shell, filePath } = get();
      if (!shell || !filePath) return;

      // オフセットを再取得してずれを防ぐ
      const content = await shell.loadFile(filePath);
      const entries = parseThinoEntries(content);
      // ID または内容＋タイムスタンプで最新エントリを特定する
      const latest = entries.find(
        (e) =>
          resolvePostId(e.metadata, filePath, e.startOffset) === post.id ||
          (e.message.trim() === post.message.trim() &&
            e.time === post.timestamp.format("HH:mm:ss")),
      );
      if (!latest) {
        await get().loadPosts();
        return;
      }

      const newText = toText(
        newMessage,
        false,
        "day",
        post.timestamp,
        latest.metadata,
      );
      await shell.replaceRange(filePath, latest.startOffset, latest.endOffset, newText);
      setTimeout(() => void get().loadPosts(), 0);
    },

    async deletePost(post) {
      const { shell, filePath } = get();
      if (!shell || !filePath) return;

      const content = await shell.loadFile(filePath);
      const entries = parseThinoEntries(content);
      const target = entries.find(
        (e) =>
          resolvePostId(e.metadata, filePath, e.startOffset) === post.id,
      );
      if (!target) {
        await get().loadPosts();
        return;
      }

      await shell.replaceRange(filePath, target.startOffset, target.endOffset, "");
      setTimeout(() => void get().loadPosts(), 0);
    },

    setSidebarOpen(open) {
      set({ sidebarOpen: open });
    },

    setEditingPost(post) {
      set({ editingPost: post });
    },

    setFilePath(filePath) {
      set({ filePath });
    },
  }));
}

export type PaperCutStore = ReturnType<typeof createPaperCutStore>;
