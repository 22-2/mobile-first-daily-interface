import { useCallback, useEffect, useRef } from "react";
import { type Key, ListBox, ListBoxItem, useDragAndDrop } from "react-aria-components";
import { PaperCutCardView } from "paper-cut/src/ui/components/PaperCutCardView";
import { PaperCutSidebar } from "paper-cut/src/ui/components/PaperCutSidebar";
import {
  useCurrentPaperCutStore,
  usePaperCutStore,
} from "paper-cut/src/ui/store/PaperCutStoreContext";
import {
  VIEW_TYPE_PAPER_CUT_EDITOR,
  type PaperCutEditorViewState,
} from "paper-cut/src/ui/view/PaperCutEditorView";
import type { PersistedEditingPost } from "src/ui/store/slices/editorSlice";
import { FloatingButton } from "src/ui/components/primitives/FloatingButton";
import { Box, Flex } from "src/ui/components/primitives";
import type { Post } from "src/ui/types";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import type { WorkspaceLeaf } from "obsidian";

// ---- ユーティリティ --------------------------------------------------------

/**
 * React Aria の dropPosition と前後の index から、
 * splice ベースの移動先 index を計算する純粋関数。
 */
function resolveDropIndex(
  fromIndex: number,
  targetIndex: number,
  dropPosition: "before" | "after" | "on",
  totalLength: number,
): number {
  const raw =
    dropPosition === "after"
      ? fromIndex < targetIndex
        ? targetIndex
        : targetIndex + 1
      : // "before" | "on"
        fromIndex > targetIndex
        ? targetIndex
        : targetIndex - 1;

  return Math.max(0, Math.min(totalLength - 1, raw));
}

/**
 * Obsidian デスクトップ専用の openPopoutLeaf を安全に呼び出す。
 * モバイル等で存在しない場合は null を返す。
 */
function tryOpenPopoutLeaf(
  workspace: import("obsidian").Workspace,
): WorkspaceLeaf | null {
  const open = (
    workspace as unknown as { openPopoutLeaf?: () => WorkspaceLeaf }
  ).openPopoutLeaf;
  return open ? open.call(workspace) : null;
}

// ---- サブコンポーネント -----------------------------------------------------

const EmptyState = () => (
  <Box className="text-[var(--text-muted)] text-sm p-4">
    ポストがありません。右下の＋ボタンから追加してください。
  </Box>
);

// ---- メインコンポーネント ---------------------------------------------------

/**
 * Paper Cut のメインレイアウト。
 * 左（メイン）: DnD 対応カードリスト  右: サイドバーアウトライン
 */
export const PaperCutViewContent = ({
  containerEl,
}: {
  /** サイドバートグルカスタムイベントを受け取るために Obsidian の containerEl を渡す */
  containerEl?: HTMLElement;
}) => {
  const store = useCurrentPaperCutStore();
  const posts = usePaperCutStore((s) => s.posts);
  const sidebarOpen = usePaperCutStore((s) => s.sidebarOpen);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Obsidian の addAction から発火する toggle-sidebar イベントを購読する
  useEffect(() => {
    if (!containerEl) return;
    const handler = () =>
      store.getState().setSidebarOpen(!store.getState().sidebarOpen);
    containerEl.addEventListener("paper-cut:toggle-sidebar", handler);
    return () =>
      containerEl.removeEventListener("paper-cut:toggle-sidebar", handler);
  }, [containerEl, store]);

  // React Aria の DnD フック
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) =>
      [...keys].map((key) => ({
        "text/plain": posts.find((p) => p.id === String(key))?.message ?? "",
      })),
    onReorder(e) {
      const movedKey = [...e.keys][0] as Key | undefined;
      if (movedKey == null) return;

      const fromIndex = posts.findIndex((p) => p.id === String(movedKey));
      const targetIndex = posts.findIndex((p) => p.id === String(e.target.key));
      if (fromIndex === -1 || targetIndex === -1) return;

      const toIndex = resolveDropIndex(
        fromIndex,
        targetIndex,
        e.target.dropPosition,
        posts.length,
      );
      void store.getState().reorderPosts(fromIndex, toIndex);
    },
  });

  // ダブルクリックでポップアウトエディタを開く
  const handleEdit = useCallback(
    (post: Post) => {
      const shell = store.getState().shell;
      if (!shell) return;

      const leaf = tryOpenPopoutLeaf(shell.getRawApp().workspace);
      if (!leaf) return;

      const postInfo: PersistedEditingPost = {
        id: post.id,
        path: post.path,
        timestampStr: post.timestamp.toISOString(),
        metadataStr: JSON.stringify(post.metadata),
        noteDateStr: post.noteDate.toISOString(),
        offset: post.startOffset,
        granularity: "day",
      };
      const state: PaperCutEditorViewState = { postInfo, message: post.message };

      void leaf.setViewState({
        type: VIEW_TYPE_PAPER_CUT_EDITOR,
        active: true,
        state,
      });
    },
    [store],
  );

  // サイドバーのアイテムクリック → メインリストの該当カードへスクロール
  const handleSidebarSelect = useCallback((post: Post) => {
    scrollRef.current
      ?.querySelector(`[data-post-id="${post.id}"]`)
      ?.scrollIntoView({ behavior: "instant", block: "start" });
  }, []);

  // FloatingButton でポスト追加
  const handleAddPost = useCallback(
    () => store.getState().addPost(""),
    [store],
  );

  return (
    <Flex className="h-full w-full overflow-hidden relative">
      {/* メインのカードリスト（DnD 対応） */}
      <Flex
        className="flex-col h-full flex-grow overflow-hidden relative"
        ref={scrollRef as React.RefObject<HTMLDivElement>}
      >
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <ListBox
            aria-label="ポスト一覧"
            className="flex flex-col gap-[2px] flex-grow overflow-y-auto overflow-x-hidden px-2 py-2 outline-none"
            dragAndDropHooks={dragAndDropHooks}
            items={posts}
            // Paper Cut ではカード選択機能は不要（MVP では省略）
            selectionMode="none"
          >
            {(post) => (
              <ListBoxItem
                id={post.id}
                textValue={post.message.slice(0, 50) || "(空)"}
                // outline-none でフォーカスリングを消す（PostCard 側で視覚的フォーカスを管理）
                className="outline-none"
              >
                {/* data-post-id でサイドバーからのスクロールターゲットにする */}
                <div data-post-id={post.id}>
                  <PaperCutCardView post={post} onEdit={handleEdit} />
                </div>
              </ListBoxItem>
            )}
          </ListBox>
        )}

        {/* ポスト追加ボタン */}
        <FloatingButton visible onClick={() => void handleAddPost()}>
          <ObsidianIcon name="plus" className="text-[var(--text-on-accent)]" />
        </FloatingButton>
      </Flex>

      {/* 右サイドバー（アウトライン） */}
      {sidebarOpen && (
        <Box className="w-[220px] min-w-[220px] h-full border-l border-[var(--background-modifier-border)] overflow-hidden">
          <PaperCutSidebar onSelect={handleSidebarSelect} />
        </Box>
      )}
    </Flex>
  );
};
