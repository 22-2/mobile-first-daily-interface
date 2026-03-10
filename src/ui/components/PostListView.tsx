import { Menu, Notice } from "obsidian";
import * as React from "react";
import { useMemo, useRef, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Box } from "@chakra-ui/react";
import { replaceDayToJa } from "../../utils/strings";
import { useMFDIContext } from "../context/MFDIAppContext";
import { PostCardView } from "./PostCardView";
import { DateDivider } from "./DateDivider";

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

  const displayedPostsWithDividers = useMemo(() => {
    const list: (
      | { type: "post"; post: Post; key: string }
      | { type: "divider"; date: MomentLike; key: string }
    )[] = [];
    let lastDate: string | null = null;

    const posts = filteredPosts.filter((x) => x.startOffset !== editingPostOffset);

    posts.forEach((post) => {
      const currentDate = post.timestamp.format("YYYY-MM-DD");
      const isTodayOnly = granularity === "day" && dateFilter === "today";
      const showDivider = !isTodayOnly && lastDate !== currentDate;

      if (showDivider) {
        list.push({
          type: "divider",
          date: post.timestamp,
          key: `divider-${currentDate}`,
        });
      }
      list.push({ type: "post", post, key: `post-${post.timestamp.valueOf()}-${post.offset}` });
      lastDate = currentDate;
    });

    return list;
  }, [filteredPosts, editingPostOffset, granularity, dateFilter]);

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
                onContextMenu={(post, e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const menu = new Menu();
                  menu.addItem((item) =>
                    item
                      .setTitle("投稿にジャンプ")
                      .setIcon("clock")
                      .onClick(() => {
                        handleClickTime(post);
                      }),
                  );
                  menu.addItem((item) =>
                    item
                      .setTitle("この日にフォーカス")
                      .setIcon("calendar-range")
                      .onClick(() => {
                        setDate(post.timestamp.clone());
                        setDisplayMode("focus");
                      }),
                  );
                  menu.addItem((item) =>
                    item
                      .setTitle("編集")
                      .setIcon("pencil")
                      .setDisabled(isReadOnly)
                      .onClick(() => {
                        startEdit(post);
                      }),
                  );
                  menu.addItem((item) =>
                    item
                      .setTitle("コピー")
                      .setIcon("copy")
                      .onClick(async () => {
                        await navigator.clipboard.writeText(post.message);
                        new Notice("copied");
                      }),
                  );
                  menu.addItem((item) =>
                    item
                      .setTitle("明日に送る")
                      .setIcon("fast-forward")
                      .setDisabled(isReadOnly)
                      .onClick(() => {
                        movePostToTomorrow(post);
                      }),
                  );
                  menu.addItem((item) =>
                    item
                      .setTitle("削除")
                      .setIcon("trash")
                      .setWarning(true)
                      .setDisabled(isReadOnly)
                      .onClick(() => {
                        deletePost(post);
                      }),
                  );
                  menu.showAtMouseEvent(e as unknown as MouseEvent);
                }}
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

import { MomentLike, Post } from "../types";
