import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import type { Post } from "src/ui/types";
import {
  createThreadId,
  resolveThreadRootId,
} from "src/ui/utils/thread-utils";
import { createStore } from "zustand/vanilla";

// ---- JSON 保存形式 ----------------------------------------------------------
//
// ```json
// [
//   { "id": "abc123", "message": "...", "timestamp": "2025-01-01T12:00:00.000Z", "metadata": {} }
// ]
// ```

interface JsonPostEntry {
  id: string;
  message: string;
  /** ISO 8601 */
  timestamp: string;
  metadata: Record<string, string>;
}

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

function replaceBlock(fileContent: string, entries: JsonPostEntry[]): string {
  const newBlock = serializeBlock(entries);
  if (JSON_BLOCK_RE.test(fileContent)) {
    return fileContent.replace(JSON_BLOCK_RE, newBlock);
  }
  const base = fileContent.trimEnd();
  return base.length > 0 ? base + "\n\n" + newBlock : newBlock;
}

function toPost(entry: JsonPostEntry, path: string): Post {
  return {
    id: entry.id,
    threadRootId: resolveThreadRootId(entry.metadata),
    timestamp: window.moment(entry.timestamp),
    noteDate: window.moment(),
    message: entry.message,
    metadata: entry.metadata,
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
  /** ViewContent で非表示にしているポスト ID の集合（インメモリのみ、ファイルに保存しない） */
  hiddenPostIds: ReadonlySet<string>;
  sidebarOpen: boolean;
  editingPost: Post | null;

  initialize: (shell: ObsidianAppShell, filePath: string) => Promise<void>;
  loadPosts: () => Promise<void>;
  addPost: (message: string) => Promise<void>;
  /**
   * 複数ポストを ID ベースで並び替える。
   * fromIndex/toIndex ではなく ID を受け取ることで、複数選択 DnD に対応する。
   */
  reorderPosts: (
    movedIds: string[],
    targetId: string,
    dropPosition: "before" | "after" | "on",
  ) => Promise<void>;
  updatePost: (post: Post, newMessage: string) => Promise<void>;
  deletePost: (post: Post) => Promise<void>;

  togglePostVisibility: (postId: string) => void;
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
    hiddenPostIds: new Set<string>(),
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

    async reorderPosts(movedIds, targetId, dropPosition) {
      const { shell, filePath, posts } = get();
      if (!shell || !filePath) return;

      const movedSet = new Set(movedIds);
      // ターゲット自身がドラッグ対象に含まれる場合は無視する
      if (movedSet.has(targetId)) return;

      const content = await shell.loadFile(filePath);
      const entries = parseEntries(content);

      if (entries.length !== posts.length) {
        await get().loadPosts();
        return;
      }

      // ドラッグ対象を元の順序のまま収集し、残りから除外する
      const movedEntries = entries.filter((e) => movedSet.has(e.id));
      const remaining = entries.filter((e) => !movedSet.has(e.id));

      const targetIdx = remaining.findIndex((e) => e.id === targetId);
      if (targetIdx === -1) {
        await get().loadPosts();
        return;
      }

      const insertAt = dropPosition === "after" ? targetIdx + 1 : targetIdx;
      remaining.splice(insertAt, 0, ...movedEntries);

      await shell.writeFile(filePath, replaceBlock(content, remaining));
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
        await get().loadPosts();
        return;
      }

      await shell.writeFile(filePath, replaceBlock(content, filtered));
      setTimeout(() => void get().loadPosts(), 0);
    },

    togglePostVisibility(postId) {
      const { hiddenPostIds } = get();
      const next = new Set(hiddenPostIds);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      set({ hiddenPostIds: next });
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
