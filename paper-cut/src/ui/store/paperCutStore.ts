import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import type { Post } from "src/ui/types";
import {
  createThreadId,
  resolveThreadRootId,
} from "src/ui/utils/thread-utils";
import { createStore } from "zustand/vanilla";

// ---- JSON 保存形式 ----------------------------------------------------------
//
// ファイル全体が以下の形式になる。他のマークダウンコンテンツがある場合は
// 最初に見つかった ```json ブロックを読み書きする。
//
// ```json
// [
//   {
//     "id": "abc123",
//     "message": "ポストの本文",
//     "timestamp": "2025-01-01T12:00:00.000Z",
//     "metadata": {}
//   }
// ]
// ```

interface JsonPostEntry {
  id: string;
  message: string;
  /** ISO 8601 */
  timestamp: string;
  metadata: Record<string, string>;
}

// ファイル内の最初の ```json ブロックを抽出する
const JSON_BLOCK_RE = /```json\r?\n([\s\S]*?)\r?\n```/;

function parseEntries(content: string): JsonPostEntry[] {
  const match = content.match(JSON_BLOCK_RE);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return [];
    return parsed as JsonPostEntry[];
  } catch {
    console.error("paper-cut: JSON ブロックのパースに失敗しました");
    return [];
  }
}

function serializeBlock(entries: JsonPostEntry[]): string {
  return "```json\n" + JSON.stringify(entries, null, 2) + "\n```";
}

// ファイル内の ```json ブロックを新しい内容で置き換える。
// ブロックが存在しない場合はファイル末尾に追記する。
function replaceBlock(fileContent: string, entries: JsonPostEntry[]): string {
  const newBlock = serializeBlock(entries);
  if (JSON_BLOCK_RE.test(fileContent)) {
    return fileContent.replace(JSON_BLOCK_RE, newBlock);
  }
  const base = fileContent.trimEnd();
  return base.length > 0 ? base + "\n\n" + newBlock : newBlock;
}

// JsonPostEntry → Post への変換。
// Paper Cut の固定ノートは daily note ではないため noteDate は常に「今日」。
function toPost(entry: JsonPostEntry, path: string): Post {
  return {
    // JSON 形式ではエントリ自身の id を直接使う（Thino の path:offset 方式は不要）
    id: entry.id,
    threadRootId: resolveThreadRootId(entry.metadata),
    timestamp: window.moment(entry.timestamp),
    noteDate: window.moment(),
    message: entry.message,
    metadata: entry.metadata,
    // JSON 形式ではバイトオフセットは不要なため 0 で埋める
    offset: 0,
    startOffset: 0,
    endOffset: 0,
    bodyStartOffset: 0,
    kind: "thino" as const,
    path,
  };
}

function newEntry(message: string): JsonPostEntry {
  return {
    id: createThreadId(),
    message,
    timestamp: new Date().toISOString(),
    metadata: {},
  };
}

// ---- ストア型定義 -----------------------------------------------------------

export interface PaperCutState {
  shell: ObsidianAppShell | null;
  filePath: string | null;
  posts: Post[];
  sidebarOpen: boolean;
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

// ---- ストア実装 -------------------------------------------------------------

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
      const entries = parseEntries(content);
      set({ posts: entries.map((e) => toPost(e, filePath)) });
    },

    async addPost(message) {
      const { shell, filePath } = get();
      if (!shell || !filePath) return;

      const content = await shell.loadFile(filePath);
      const entries = parseEntries(content);
      entries.push(newEntry(message));
      await shell.writeFile(filePath, replaceBlock(content, entries));

      // 意図: loadPosts() を React クリックハンドラの呼び出しスタック内で await すると
      //        DOM プロパティへの書き込みエラーが発生するため次 tick へ逃がす。
      setTimeout(() => void get().loadPosts(), 0);
    },

    async reorderPosts(fromIndex, toIndex) {
      if (fromIndex === toIndex) return;

      const { shell, filePath, posts } = get();
      if (!shell || !filePath) return;

      const content = await shell.loadFile(filePath);
      const entries = parseEntries(content);

      // ファイルと状態がずれている場合は再読み込みして終了する
      if (entries.length !== posts.length) {
        await get().loadPosts();
        return;
      }

      const reordered = [...entries];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      await shell.writeFile(filePath, replaceBlock(content, reordered));
      setTimeout(() => void get().loadPosts(), 0);
    },

    async updatePost(post, newMessage) {
      const { shell, filePath } = get();
      if (!shell || !filePath) return;

      const content = await shell.loadFile(filePath);
      const entries = parseEntries(content);

      const idx = entries.findIndex((e) => e.id === post.id);
      if (idx === -1) {
        await get().loadPosts();
        return;
      }

      entries[idx] = { ...entries[idx], message: newMessage };
      await shell.writeFile(filePath, replaceBlock(content, entries));
      setTimeout(() => void get().loadPosts(), 0);
    },

    async deletePost(post) {
      const { shell, filePath } = get();
      if (!shell || !filePath) return;

      const content = await shell.loadFile(filePath);
      const entries = parseEntries(content);

      const filtered = entries.filter((e) => e.id !== post.id);
      if (filtered.length === entries.length) {
        // 見つからなかった場合は再読み込みのみ
        await get().loadPosts();
        return;
      }

      await shell.writeFile(filePath, replaceBlock(content, filtered));
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
