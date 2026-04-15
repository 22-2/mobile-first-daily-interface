import { Menu } from "obsidian";
import { useCallback, useEffect, useRef } from "react";
import {
  type Key,
  DropIndicator,
  ListBox,
  ListBoxItem,
  useDragAndDrop,
} from "react-aria-components";
import { CardView } from "paper-cut/src/ui/components/CardView";
import { Sidebar } from "paper-cut/src/ui/components/Sidebar";
import {
  useCurrentPaperCutStore,
  usePaperCutStore,
} from "paper-cut/src/ui/store/PaperCutStoreContext";
import {
  VIEW_TYPE_PAPER_CUT_EDITOR,
  type EditorViewState,
} from "paper-cut/src/ui/view/EditorView";
import type { PersistedEditingPost } from "src/ui/store/slices/editorSlice";
import { FloatingButton } from "src/ui/components/primitives/FloatingButton";
import { Box, Flex } from "src/ui/components/primitives";
import type { Post } from "src/ui/types";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import type { WorkspaceLeaf } from "obsidian";

// ---- ユーティリティ --------------------------------------------------------

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

export const ViewContent = ({
  containerEl,
}: {
  containerEl?: HTMLElement;
}) => {
  const store = useCurrentPaperCutStore();
  const posts = usePaperCutStore((s) => s.posts);
  const hiddenPostIds = usePaperCutStore((s) => s.hiddenPostIds);
  const sidebarOpen = usePaperCutStore((s) => s.sidebarOpen);
  const scrollRef = useRef<HTMLDivElement>(null);

  // サイドバーの目アイコンで非表示にされたポストを除外する
  const visiblePosts = posts.filter((p) => !hiddenPostIds.has(p.id));

  useEffect(() => {
    if (!containerEl) return;
    const handler = () =>
      store.getState().setSidebarOpen(!store.getState().sidebarOpen);
    containerEl.addEventListener("paper-cut:toggle-sidebar", handler);
    return () =>
      containerEl.removeEventListener("paper-cut:toggle-sidebar", handler);
  }, [containerEl, store]);

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
      const state: EditorViewState = { postInfo, message: post.message };

      void leaf.setViewState({
        type: VIEW_TYPE_PAPER_CUT_EDITOR,
        active: true,
        state,
      });
    },
    [store],
  );

  // Obsidian の Menu API を使った右クリックメニュー
  const handleContextMenu = useCallback(
    (post: Post, e: React.MouseEvent) => {
      e.preventDefault();
      const menu = new Menu();

      menu.addItem((item) =>
        item
          .setTitle("編集")
          .setIcon("pencil")
          .onClick(() => handleEdit(post)),
      );
      menu.addItem((item) =>
        item
          .setTitle("コピー")
          .setIcon("copy")
          .onClick(() => void navigator.clipboard.writeText(post.message)),
      );
      menu.addSeparator();
      menu.addItem((item) =>
        item
          .setTitle("削除")
          .setIcon("trash")
          .onClick(() => void store.getState().deletePost(post)),
      );

      menu.showAtMouseEvent(e.nativeEvent as MouseEvent);
    },
    [handleEdit, store],
  );

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) =>
      [...keys].map((key) => ({
        "text/plain":
          visiblePosts.find((p) => p.id === String(key))?.message ?? "",
      })),
    onReorder(e) {
      const movedIds = [...e.keys].map(String);
      const targetId = String(e.target.key);
      void store.getState().reorderPosts(movedIds, targetId, e.target.dropPosition);
    },
    // 複数ドラッグ中のカウントバッジ
    renderDragPreview(items) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--background-primary)] border border-[var(--interactive-accent)] shadow-lg text-[var(--text-normal)] text-xs whitespace-nowrap">
          <span className="bg-[var(--interactive-accent)] text-[var(--text-on-accent)] rounded-full min-w-[1.25rem] h-5 flex items-center justify-center font-bold px-1">
            {items.length}
          </span>
          件を移動
        </div>
      );
    },
    // h = ListBoxItem の py × 2（= 6px）で負マージンを使い、レイアウトシフトをゼロにする
    renderDropIndicator: (target) => (
      <DropIndicator
        target={target}
        className="list-none h-[6px] -mt-[3px] -mb-[3px] px-2 flex items-center"
      >
        {({ isDropTarget }: { isDropTarget: boolean }) => (
          <div
            className={`h-[2px] w-full rounded-full bg-[var(--interactive-accent)] transition-opacity duration-100 ${
              isDropTarget ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </DropIndicator>
    ),
  });

  const handleSidebarSelect = useCallback((post: Post) => {
    scrollRef.current
      ?.querySelector(`[data-post-id="${post.id}"]`)
      ?.scrollIntoView({ behavior: "instant", block: "start" });
  }, []);

  const handleAddPost = useCallback(
    () => store.getState().addPost(""),
    [store],
  );

  return (
    <Flex className="h-full w-full overflow-hidden relative">
      <Flex
        className="flex-col h-full flex-grow overflow-hidden relative"
        ref={scrollRef as React.RefObject<HTMLDivElement>}
      >
        {visiblePosts.length === 0 ? (
          <EmptyState />
        ) : (
          <ListBox
            aria-label="ポスト一覧"
            className="flex flex-col flex-grow overflow-y-auto overflow-x-hidden px-2 py-2 outline-none"
            dragAndDropHooks={dragAndDropHooks}
            items={visiblePosts}
            // ファイルエクスプローラと同じ操作感：クリックで単一選択、Cmd/Ctrl+クリックでトグル、Shift+クリックで範囲選択
            selectionMode="multiple"
            selectionBehavior="replace"
          >
            {(post) => (
              <ListBoxItem
                id={post.id}
                textValue={post.message.slice(0, 50) || "(空)"}
                className="outline-none py-[3px]"
              >
                {({ isSelected }: { isSelected: boolean }) => (
                  <div data-post-id={post.id}>
                    <CardView
                      post={post}
                      isSelected={isSelected}
                      onEdit={handleEdit}
                      onContextMenu={handleContextMenu}
                    />
                  </div>
                )}
              </ListBoxItem>
            )}
          </ListBox>
        )}

        <FloatingButton visible onClick={() => void handleAddPost()}>
          <ObsidianIcon name="plus" className="text-[var(--text-on-accent)]" />
        </FloatingButton>
      </Flex>

      {sidebarOpen && (
        <Box className="w-[220px] min-w-[220px] h-full border-l border-[var(--background-modifier-border)] overflow-hidden">
          <Sidebar onSelect={handleSidebarSelect} />
        </Box>
      )}
    </Flex>
  );
};
