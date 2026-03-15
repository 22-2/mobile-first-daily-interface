import { Box } from "@chakra-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { useEffect } from "react";
import { DateDivider } from "src/ui/components/posts/DateDivider";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { PostCardView } from "src/ui/components/posts/PostCardView";
import { useInfiniteTimeline } from "src/ui/hooks/internal/useInfiniteTimeline";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { usePostContextMenu } from "src/ui/hooks/usePostContextMenu";
import { useTimelineItems } from "src/ui/hooks/useTimelineItems";
import { useEditorStore } from "src/ui/store/editorStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

export const PostListView: React.FC = React.memo(() => {
  const settings = useSettingsStore(
    useShallow((s) => ({
      granularity: s.granularity,
      displayMode: s.displayMode,
      dateFilter: s.dateFilter,
      isReadOnly: s.isReadOnly(),
      setDate: s.setDate,
      setDisplayMode: s.setDisplayMode,
      setThreadFocusRootId: s.setThreadFocusRootId,
      asTask: s.asTask,
      timeFilter: s.timeFilter,
      threadFocusRootId: s.threadFocusRootId,
    })),
  );

  const { posts } = usePostsStore(
    useShallow((s) => ({
      posts: s.posts,
    })),
  );

  const { editingPostOffset, startEdit, scrollContainerRef } = useEditorStore(
    useShallow((s) => ({
      editingPostOffset: s.editingPostOffset,
      startEdit: s.startEdit,
      scrollContainerRef: s.scrollContainerRef,
    })),
  );

  const { loadMore, hasMore } = useInfiniteTimeline();
  const { handleClickTime, deletePost, movePostToTomorrow } = usePostActions();

  const filteredPosts = useFilteredPosts({
    posts,
    ...settings,
    includeThreadReplies: true,
  });

  const { granularity, displayMode, dateFilter, threadFocusRootId, setThreadFocusRootId } = settings;

  const { showPostContextMenu } = usePostContextMenu();
  const displayedPostsWithDividers = useTimelineItems(
    filteredPosts,
    editingPostOffset,
    granularity,
    displayMode,
    dateFilter,
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

  const virtualItems = rowVirtualizer.getVirtualItems();

  // 無限スクロールのトリガー
  useEffect(() => {
    if (threadFocusRootId) return;
    if (displayMode !== DISPLAY_MODE.TIMELINE || !hasMore) return;

    // もし表示するアイテムが全く無い場合は、初期読み込みで空ファイルに当たった可能性があるので即座に次を読み込む
    if (displayedPostsWithDividers.length === 0) {
      loadMore();
      return;
    }

    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem.index >= displayedPostsWithDividers.length - 1) {
      loadMore();
    }
  }, [
    displayMode,
    hasMore,
    loadMore,
    displayedPostsWithDividers.length,
    virtualItems.length,
    virtualItems[virtualItems.length - 1]?.index,
    threadFocusRootId,
  ]);

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
                isThreadFocused={item.post.id === threadFocusRootId}
                onToggleThreadFocus={(post) => {
                  setThreadFocusRootId(
                    threadFocusRootId === post.id ? null : post.id,
                  );
                }}
              />
            )}
          </Box>
        );
      })}
      {displayMode === DISPLAY_MODE.TIMELINE && hasMore && !threadFocusRootId && (
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
      {displayMode === DISPLAY_MODE.TIMELINE && !hasMore && !threadFocusRootId && (
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
