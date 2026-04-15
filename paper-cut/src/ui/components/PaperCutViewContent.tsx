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
import { showInputModal } from "src/ui/modals/InputModal";
import { Box, Flex } from "src/ui/components/primitives";
import type { Post } from "src/ui/types";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";

// Paper Cut のメインレイアウト。
// 左（メイン）: DnD 対応カードリスト  右: サイドバーアウトライン
export const PaperCutViewContent = ({
  containerEl,
}: {
  // サイドバートグルカスタムイベントを受け取るために Obsidian の containerEl を渡す
  containerEl?: HTMLElement;
}) => {
  const store = useCurrentPaperCutStore();
  const posts = usePaperCutStore((s) => s.posts);
  const sidebarOpen = usePaperCutStore((s) => s.sidebarOpen);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Obsidian の addAction から発火する toggle-sidebar イベントを購読する
  useEffect(() => {
    if (!containerEl) return;
    const handler = () => store.getState().setSidebarOpen(!store.getState().sidebarOpen);
    containerEl.addEventListener("paper-cut:toggle-sidebar", handler);
    return () => containerEl.removeEventListener("paper-cut:toggle-sidebar", handler);
  }, [containerEl, store]);

  // React Aria の DnD フック
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) =>
      [...keys].map((key) => ({
        "text/plain":
          posts.find((p) => p.id === String(key))?.message ?? "",
      })),
    onReorder(e) {
      const movedKey = [...e.keys][0] as Key | undefined;
      if (movedKey == null) return;
      const fromIndex = posts.findIndex((p) => p.id === String(movedKey));
      const targetIndex = posts.findIndex(
        (p) => p.id === String(e.target.key),
      );
      if (fromIndex === -1 || targetIndex === -1) return;

      // dropPosition を splice ベースの toIndex に変換する
      let finalPos: number;
      if (e.target.dropPosition === "after") {
        finalPos = fromIndex < targetIndex ? targetIndex : targetIndex + 1;
      } else {
        // "before" or "on"
        finalPos = fromIndex > targetIndex ? targetIndex : targetIndex - 1;
      }
      finalPos = Math.max(0, Math.min(posts.length - 1, finalPos));
      void store.getState().reorderPosts(fromIndex, finalPos);
    },
  });

  // ダブルクリックでポップアウトエディタを開く
  const handleEdit = useCallback(
    (post: Post) => {
      const shell = store.getState().shell;
      if (!shell) return;

      const app = shell.getRawApp();
      // 意図: openPopoutLeaf は Obsidian デスクトップ専用 API のため型定義にない。
      //        存在しない環境（モバイル等）では何もしない。
      const openPopout = (
        app.workspace as unknown as {
          openPopoutLeaf?: () => import("obsidian").WorkspaceLeaf;
        }
      ).openPopoutLeaf;
      if (!openPopout) return;

      const leaf = openPopout.call(app.workspace);
      const postInfo: PersistedEditingPost = {
        id: post.id,
        path: post.path,
        timestampStr: post.timestamp.toISOString(),
        metadataStr: JSON.stringify(post.metadata),
        noteDateStr: post.noteDate.toISOString(),
        offset: post.startOffset,
        granularity: "day",
      };
      const state: PaperCutEditorViewState = {
        postInfo,
        message: post.message,
      };
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
    const el = scrollRef.current?.querySelector(`[data-post-id="${post.id}"]`);
    el?.scrollIntoView({ behavior: "instant", block: "start" });
  }, []);

  // FloatingButton でポスト追加
  const handleAddPost = useCallback(async () => {
    await store.getState().addPost("");
  }, [store]);

  return (
    <Flex className="h-full w-full overflow-hidden relative">
      {/* メインのカードリスト（DnD 対応） */}
      <Flex
        className="flex-col h-full flex-grow overflow-hidden relative"
        ref={scrollRef as React.RefObject<HTMLDivElement>}
      >
        {posts.length === 0 ? (
          <Box className="text-[var(--text-muted)] text-sm p-4">
            ポストがありません。右下の＋ボタンから追加してください。
          </Box>
        ) : (
          <ListBox
            className="flex flex-col gap-[2px] flex-grow overflow-y-auto overflow-x-hidden px-2 py-2 outline-none"
            dragAndDropHooks={dragAndDropHooks}
            items={posts}
            // 意図: Paper Cut ではカード選択機能は不要（MVP では省略）
            selectionMode="none"
            aria-label="ポスト一覧"
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
                  <PaperCutCardView
                    post={post}
                    onEdit={handleEdit}
                  />
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
