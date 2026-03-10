import { Menu, Notice } from "obsidian";
import * as React from "react";
import { useMemo, useRef, useEffect } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { replaceDayToJa } from "../../utils/strings";
import { useAppContext } from "../context/AppContext";
import { useMFDIContext } from "../context/MFDIAppContext";
import { DeleteConfirmModal } from "../modals/DeleteConfirmModal";
import { PostCardView } from "./PostCardView";
import { Box, Divider, Flex, Text } from "@chakra-ui/react";
import { granularityConfig } from "../config/granularity-config";

export const PostListView: React.FC = React.memo(() => {
  const { app } = useAppContext();
  const {
    filteredPosts,
    editingPostOffset,
    granularity,
    date: viewedDate,
    timeFilter,
    dateFilter,
    handleClickTime,
    startEdit,
    deletePost,
    movePostToTomorrow,
    isReadOnly,
    setDate,
    setDisplayMode,
    displayMode,
    loadMore,
    hasMore,
  } = useMFDIContext();

  const displayedPosts = useMemo(
    () => filteredPosts.filter((x) => x.startOffset !== editingPostOffset),
    [filteredPosts, editingPostOffset],
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (displayMode !== "timeline" || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }
    return () => observer.disconnect();
  }, [displayMode, loadMore, hasMore]);
  let lastDate: string | null = null;

  return (
    <TransitionGroup className="list" style={{ padding: "var(--size-4-4) 0" }}>
      {displayedPosts.map((x) => {
        const currentDate = x.timestamp.format("YYYY-MM-DD");
        const isTodayOnly = granularity === "day" && dateFilter === "today";
        const showDivider = !isTodayOnly && lastDate !== currentDate;
        lastDate = currentDate;

        const { unit } = granularityConfig[granularity];
        const isDimmed = x.timestamp.isBefore(window.moment(), unit);

        return (
          <CSSTransition
            key={x.timestamp.valueOf()}
            timeout={300}
            classNames="item"
          >
            <div>
              {showDivider && (
                <Flex
                  className="mfdi-date-divider"
                  placeContent="center"
                  fontSize= "var(--font-smallest);"
                  fontWeight= "bold"
                  color= "var(--text-muted)"
                  gap= "1em"
                >
                  <Text marginY= "var(--size-4-2)" whiteSpace="nowrap" color="var(--text-muted)">
                    {replaceDayToJa(x.timestamp.format("YYYY-MM-DD (ddd)"))}
                  </Text>

                </Flex>
              )}
              <PostCardView
                post={x}
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
                      .setDisabled(isDimmed || isReadOnly)
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
                      .setDisabled(isDimmed || isReadOnly)
                      .onClick(() => {
                        movePostToTomorrow(post);
                      }),
                  );
                  menu.addItem((item) =>
                    item
                      .setTitle("削除")
                      .setIcon("trash")
                      .setWarning(true)
                      .setDisabled(isDimmed || isReadOnly)
                      .onClick(() => {
                        deletePost(post);
                      }),
                  );
                  menu.showAtMouseEvent(e as unknown as MouseEvent);
                }}
              />
            </div>
          </CSSTransition>
        );
      })}
      {displayMode === "timeline" && (
        <Box
          ref={hasMore ? sentinelRef : undefined}
          height="100px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="var(--text-muted)"
          fontSize="var(--font-smallest)"
        >
          {hasMore ? "読み込み中..." : "これ以上投稿はありません"}
        </Box>
      )}
    </TransitionGroup>
  );
});
