import { Menu } from "obsidian";
import { useCallback } from "react";
import { DropIndicator, type Key, ListBox, ListBoxItem, useDragAndDrop } from "react-aria-components";
import { usePaperCutStore, useCurrentPaperCutStore } from "paper-cut/src/ui/store/PaperCutStoreContext";
import { Box } from "src/ui/components/primitives";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import type { Post } from "src/ui/types";

// Paper Cut の右サイドバー。ポスト一覧のアウトライン表示と DnD 並べ替えを担う。
// クリックするとメインリストの該当カードへスクロールする。
export const Sidebar = ({
  onSelect,
}: {
  onSelect?: (post: Post) => void;
}) => {
  const store = useCurrentPaperCutStore();
  const posts = usePaperCutStore((s) => s.posts);
  const hiddenPostIds = usePaperCutStore((s) => s.hiddenPostIds);

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) =>
      [...keys].map((key) => ({
        "text/plain": posts.find((p) => p.id === String(key))?.message ?? "",
      })),
    onReorder(e) {
      // 新シグネチャ：ID ベースで複数選択 DnD に対応
      const movedIds = [...e.keys].map(String);
      const targetId = String(e.target.key);
      void store.getState().reorderPosts(movedIds, targetId, e.target.dropPosition);
    },
    // h = ListBoxItem の py × 2（= 8px）で負マージンを使い、レイアウトシフトをゼロにする
    renderDropIndicator: (target) => (
      <DropIndicator
        target={target}
        className="list-none h-[8px] -mt-[4px] -mb-[4px] px-2 flex items-center"
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

  // Obsidian の Menu API を使った右クリックメニュー
  const handleContextMenu = useCallback(
    (post: Post, e: React.MouseEvent) => {
      e.preventDefault();
      const isHidden = hiddenPostIds.has(post.id);
      const menu = new Menu();

      menu.addItem((item) =>
        item
          .setTitle(isHidden ? "表示する" : "非表示にする")
          .setIcon(isHidden ? "eye" : "eye-off")
          .onClick(() => store.getState().togglePostVisibility(post.id)),
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
    [hiddenPostIds, store],
  );

  return (
    <Box className="flex flex-col h-full">
      <Box className="px-3 py-2 text-xs text-[var(--text-muted)] font-medium border-b border-[var(--background-modifier-border)]">
        アウトライン
      </Box>
      <ListBox
        className="flex flex-col overflow-y-auto flex-grow outline-none py-1"
        dragAndDropHooks={dragAndDropHooks}
        items={posts}
        selectionMode="single"
        aria-label="アウトライン"
        onSelectionChange={(keys) => {
          const key = [...keys][0];
          if (!key) return;
          const post = posts.find((p) => p.id === String(key));
          if (post) onSelect?.(post);
        }}
      >
        {(post) => {
          const isHidden = hiddenPostIds.has(post.id);
          return (
            // group クラスで子要素のホバー連動を可能にする
            <ListBoxItem
              id={post.id}
              textValue={post.message.slice(0, 60) || "(空)"}
              className="group px-3 py-[4px] text-xs cursor-pointer outline-none
                hover:bg-[var(--background-modifier-hover)]
                selected:bg-[var(--background-modifier-active-hover)]
                focus-visible:bg-[var(--background-modifier-hover)]"
            >
              <div
                className="flex items-center gap-1 w-full"
                onContextMenu={(e) => handleContextMenu(post, e)}
              >
                {/* テキスト部分：非表示のときは薄く表示 */}
                <span
                  className={`flex-1 truncate transition-opacity ${
                    isHidden ? "opacity-40" : ""
                  }`}
                >
                  {post.message.slice(0, 60) || "(空)"}
                </span>

                {/* 目アイコン：ホバー時のみ表示 / 非表示中は常に表示 */}
                <button
                  type="button"
                  // ポインターダウンで DnD が始まるのを防ぐため伝播を止める
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    store.getState().togglePostVisibility(post.id);
                  }}
                  className={`flex-shrink-0 transition-opacity ${
                    isHidden
                      ? "opacity-60"
                      : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
                  }`}
                  aria-label={isHidden ? "表示する" : "非表示にする"}
                >
                  <ObsidianIcon
                    name={isHidden ? "eye-off" : "eye"}
                    size="0.9em"
                    className="pointer-events-none"
                  />
                </button>
              </div>
            </ListBoxItem>
          );
        }}
      </ListBox>
    </Box>
  );
};
