import { Box } from "@chakra-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { useEffect } from "react";
import { DateDivider } from "src/ui/components/posts/DateDivider";
import { PostCardView } from "src/ui/components/posts/PostCardView";
import { useMFDIContext } from "src/ui/context/MFDIAppContext";
import { usePostContextMenu } from "src/ui/hooks/usePostContextMenu";

import { useTimelineItems } from "src/ui/hooks/useTimelineItems";

export const PostListView: React.FC = React.memo(() => {
  const {
    filteredPosts,
    editingPostOffset,
    granularity,
    displayMode,
    loadMore,
    hasMore,
    scrollContainerRef,
    handleClickTime,
    startEdit,
    deletePost,
    movePostToTomorrow,
    isReadOnly,
    setDate,
    setDisplayMode,
    dateFilter,
  } = useMFDIContext();

  const { showPostContextMenu } = usePostContextMenu();
  const displayedPostsWithDividers = useTimelineItems(
    filteredPosts,
    editingPostOffset,
    granularity,
    displayMode,
    dateFilter
  );

  const parentRef = scrollContainerRef;

  const rowVirtualizer = useVirtualizer({
    count: displayedPostsWithDividers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = displayedPostsWithDividers[index];
      return item.type === "divider" ? 50 : 120; // 暫定の高さ
    },
    overscan: 10,
  });

  // 無限スクロールのトリガー
  useEffect(() => {
    if (displayMode !== "timeline" || !hasMore) return;

    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem.index >= displayedPostsWithDividers.length - 1) {
      loadMore();
    }
  }, [
    rowVirtualizer.getVirtualItems(),
    displayMode,
    hasMore,
    loadMore,
    displayedPostsWithDividers.length,
  ]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <Box
      className="list"
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {virtualItems.map((virtualItem) => {
        const item = displayedPostsWithDividers[virtualItem.index];

        return (
          <Box
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={rowVirtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
              paddingBottom: "1px", // 境界線の重なり防止
            }}
          >
            {item.type === "divider" ? (
              <DateDivider date={item.date} />
            ) : (
              <PostCardView
                post={item.post}
                granularity={granularity}
                dateFilter={dateFilter}
                onEdit={startEdit}
                onContextMenu={showPostContextMenu}
              />
            )}
          </Box>
        );
      })}
      {displayMode === "timeline" && hasMore && (
        <Box
          style={{
            position: "absolute",
            top: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            height: "100px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: "var(--font-smallest)",
          }}
        >
          読み込み中...
        </Box>
      )}
      {displayMode === "timeline" && !hasMore && (
        <Box
          style={{
            position: "absolute",
            top: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            height: "100px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: "var(--font-smallest)",
          }}
        >
          これ以上投稿はありません
        </Box>
      )}
    </Box>
  );
});

