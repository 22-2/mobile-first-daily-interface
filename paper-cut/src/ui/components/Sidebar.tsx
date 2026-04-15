import { DropIndicator, type Key, ListBox, ListBoxItem, useDragAndDrop } from "react-aria-components";
import { usePaperCutStore, useCurrentPaperCutStore } from "paper-cut/src/ui/store/PaperCutStoreContext";
import { Box } from "src/ui/components/primitives";
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
      const targetIndex = posts.findIndex((p) => p.id === String(e.target.key));
      if (fromIndex === -1 || targetIndex === -1) return;

      let finalPos: number;
      if (e.target.dropPosition === "after") {
        finalPos = fromIndex < targetIndex ? targetIndex : targetIndex + 1;
      } else {
        finalPos = fromIndex > targetIndex ? targetIndex : targetIndex - 1;
      }
      finalPos = Math.max(0, Math.min(posts.length - 1, finalPos));
      void store.getState().reorderPosts(fromIndex, finalPos);
    },
    // h = ListBoxItem の py × 2（= 8px）にして、負マージンで隣接 padding を吸収する
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
        {(post) => (
          <ListBoxItem
            id={post.id}
            textValue={post.message.slice(0, 60) || "(空)"}
            className="px-3 py-[4px] text-xs cursor-pointer truncate outline-none
              text-[var(--text-normal)]
              hover:bg-[var(--background-modifier-hover)]
              selected:bg-[var(--background-modifier-active-hover)]
              focus-visible:bg-[var(--background-modifier-hover)]"
          >
            {/* 先頭60文字だけ表示してアウトラインとして使う */}
            {post.message.slice(0, 60) || "(空)"}
          </ListBoxItem>
        )}
      </ListBox>
    </Box>
  );
};
