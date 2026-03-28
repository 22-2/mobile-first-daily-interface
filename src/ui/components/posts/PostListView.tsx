import { useVirtualizer } from "@tanstack/react-virtual";
import { Menu, Notice } from "obsidian";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { DateDivider } from "src/ui/components/posts/DateDivider";
import { PostCardView } from "src/ui/components/posts/PostCardView";
import { Box } from "src/ui/components/primitives/Box";
import { FloatingButton } from "src/ui/components/primitives/FloatingButton";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { useInfiniteTimeline } from "src/ui/hooks/internal/useInfiniteTimeline";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { useEditorStore } from "src/ui/store/editorStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { MomentLike, Post } from "src/ui/types";
import { getRawTagMetadata } from "src/ui/utils/post-metadata";
import { isThreadReply, isThreadRoot } from "src/ui/utils/thread-utils";
import { isThreadView, isTimelineView } from "src/ui/utils/view-mode";
import { getMFDIViewCapabilities } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

type TimelineItem =
  | { type: "post"; post: Post; key: string }
  | { type: "divider"; date: MomentLike; key: string };

export const PostListView: React.FC = memo(() => {
  const { showTextInput, confirmDeleteAction } = useObsidianUi();
  const settings = useSettingsStore(
    useShallow((s) => ({
      activeTag: s.activeTag,
      granularity: s.granularity,
      displayMode: s.displayMode,
      dateFilter: s.dateFilter,
      setDate: s.setDate,
      setDisplayMode: s.setDisplayMode,
      setThreadFocusRootId: s.setThreadFocusRootId,
      asTask: s.asTask,
      isReadOnly: s.isReadOnly(),
      timeFilter: s.timeFilter,
      threadFocusRootId: s.threadFocusRootId,
      viewNoteMode: s.viewNoteMode,
    })),
  );

  const { posts } = usePostsStore(
    useShallow((s) => ({
      posts: s.posts,
    })),
  );

  const {
    editingPostOffset,
    editingPost,
    startEdit,
    setEditingPost,
    scrollContainerRef,
  } = useEditorStore(
    useShallow((s) => ({
      editingPostOffset: s.editingPostOffset,
      editingPost: s.editingPost,
      startEdit: s.startEdit,
      setEditingPost: s.setEditingPost,
      scrollContainerRef: s.scrollContainerRef,
    })),
  );

  const { allPosts, loadMore, hasMore } = useInfiniteTimeline();
  const {
    handleClickTime,
    deletePost,
    permanentlyDeletePost,
    movePostToTomorrow,
    archivePost,
    createThread,
    setPostTags,
  } = usePostActions();

  const timelineView = isTimelineView(settings.displayMode);

  const filteredPosts = useFilteredPosts({
    posts: timelineView ? allPosts : posts,
    ...settings,
    includeThreadReplies: true,
  });

  const capabilities = useMemo(
    () => getMFDIViewCapabilities({ noteMode: settings.viewNoteMode }),
    [settings.viewNoteMode],
  );

  const {
    granularity,
    displayMode,
    dateFilter,
    isReadOnly,
    setDate,
    setDisplayMode,
    threadFocusRootId,
    setThreadFocusRootId,
  } = settings;
  const threadView = isThreadView({ displayMode, threadFocusRootId });

  const showPostContextMenu = useCallback(
    (post: Post, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const menu = new Menu();

      menu.addItem((item) => {
        item.setTitle("実験的").setIcon("beaker");
        const sub = item.setSubmenu();

        sub.addItem((si) =>
          si
            .setTitle(isThreadRoot(post) ? "スレッドを表示" : "スレッドを作成")
            .setIcon("spool")
            .setDisabled(isReadOnly || isThreadReply(post))
            .onClick(() => {
              createThread(post);
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("この日にフォーカス")
            .setIcon("calendar-range")
            .setDisabled(!capabilities.supportsDateNavigation)
            .onClick(() => {
              setDate(post.timestamp.clone());
              setDisplayMode(DISPLAY_MODE.FOCUS);
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("明日に送る")
            .setIcon("fast-forward")
            .setDisabled(
              isReadOnly || !capabilities.supportsMovePostBetweenDays,
            )
            .onClick(() => {
              movePostToTomorrow(post);
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("タグ付け")
            .setIcon("tag")
            .setDisabled(isReadOnly || !capabilities.supportsTags)
            .onClick(async () => {
              const nextValue = await showTextInput({
                title: "タグを入力",
                placeholder: "IT, Later",
                defaultValue: getRawTagMetadata(post.metadata),
              });

              if (nextValue === null) {
                return;
              }

              await setPostTags(post, nextValue);
            }),
        );
      });

      menu.addSeparator();

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

      menu.addSeparator();

      menu.addItem((item) =>
        item
          .setTitle("アーカイブ")
          .setIcon("archive")
          .setDisabled(isReadOnly)
          .onClick(() => {
            archivePost(post);
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

      menu.addItem((item) =>
        item
          .setTitle("永久に削除")
          .setIcon("trash")
          .setWarning(true)
          .setDisabled(isReadOnly)
          .onClick(() => {
            confirmDeleteAction(() => permanentlyDeletePost(post));
          }),
      );

      menu.showAtMouseEvent(e as unknown as MouseEvent);
    },
    [
      archivePost,
      createThread,
      deletePost,
      handleClickTime,
      isReadOnly,
      movePostToTomorrow,
      setPostTags,
      setDate,
      setDisplayMode,
      startEdit,
      capabilities.supportsDateNavigation,
      capabilities.supportsMovePostBetweenDays,
      capabilities.supportsTags,
      showTextInput,
      confirmDeleteAction,
    ],
  );

  const displayedPostsWithDividers = useMemo(() => {
    const list: TimelineItem[] = [];
    let lastDate: string | null = null;

    const postsToDisplay = filteredPosts.filter(
      (post) => post.startOffset !== editingPostOffset,
    );

    postsToDisplay.forEach((post) => {
      const currentDate = post.timestamp.format("YYYY-MM-DD");
      const shouldShowDividers =
        // fixedノートは複数日の投稿が混在するため、常にdividerを表示する
        settings.viewNoteMode === "fixed" ||
        isTimelineView(displayMode) ||
        granularity !== "day" ||
        dateFilter !== "today";
      const isDateChanged = lastDate !== currentDate;
      const isFirstItem = lastDate === null;
      const isDateInPast = post.timestamp.isBefore(new Date(), "day");
      const showDivider =
        shouldShowDividers && isDateChanged && (!isFirstItem || isDateInPast);

      if (showDivider) {
        list.push({
          type: "divider",
          date: post.timestamp,
          key: `divider-${currentDate}`,
        });
      }

      list.push({
        type: "post",
        post,
        key: `post-${post.timestamp.valueOf()}-${post.offset}`,
      });

      lastDate = currentDate;
    });

    return list;
  }, [
    filteredPosts,
    editingPostOffset,
    granularity,
    displayMode,
    dateFilter,
    settings.viewNoteMode,
  ]);

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

  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollToTop = useCallback(() => {
    rowVirtualizer.scrollToIndex(0, { align: "start", behavior: "instant" });
  }, [parentRef, rowVirtualizer]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const onScroll = () => {
      setShowScrollTop(el.scrollTop > 200);
    };

    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [parentRef]);

  // 編集中のポストを現在のリストから再特定する
  // オフセットがズレている可能性があるので、IDなどで再特定して同期する
  useEffect(() => {
    if (editingPostOffset === null) return;
    if (editingPost && editingPost.startOffset === editingPostOffset) return;

    const realPost = posts.find((p) => p.startOffset === editingPostOffset);
    if (realPost) {
      setEditingPost(realPost);
    }
  }, [posts, editingPostOffset, editingPost, setEditingPost]);

  // 無限スクロールのトリガー
  useEffect(() => {
    if (threadView) return;
    if (!timelineView || !hasMore) return;

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
    timelineView,
    hasMore,
    loadMore,
    displayedPostsWithDividers.length,
    virtualItems.length,
    virtualItems[virtualItems.length - 1]?.index,
    threadView,
  ]);

  return (
    <Box
      className="list w-full relative"
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
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
                    post.noteDate,
                  );
                }}
              />
            )}
          </Box>
        );
      })}
      {timelineView && !threadView && hasMore && (
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
      {timelineView && !threadView && !hasMore && (
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
      <FloatingButton className="up-button fixed" onClick={scrollToTop} visible={showScrollTop}>
        <ObsidianIcon className="text-[var(--text-on-accent)]" name="chevron-up" boxSize="1.2em" />
      </FloatingButton>
    </Box>
  );
});
