import { Menu, Notice } from "obsidian";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { DateDivider } from "src/ui/components/posts/DateDivider";
import { PostCardView } from "src/ui/components/posts/PostCardView";
import { Box } from "src/ui/components/primitives/Box";
import { FloatingButton } from "src/ui/components/primitives/FloatingButton";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { MomentLike, Post } from "src/ui/types";
import { getRawTagMetadata, isPinned } from "src/ui/utils/post-metadata";
import { isThreadReply, isThreadRoot } from "src/ui/utils/thread-utils";
import { isThreadView, isTimelineView } from "src/ui/utils/view-mode";
import { getMFDIViewCapabilities } from "src/ui/view/state";
import { Virtualizer, type VirtualizerHandle } from "virtua";
import { useShallow } from "zustand/shallow";
import { cn } from "../primitives/utils";
import { useAppContext } from "src/ui/context/AppContext";

type TimelineItem =
  | { type: "post"; post: Post; key: string }
  | { type: "divider"; date: MomentLike; key: string }
  | { type: "pinned-divider"; key: string };

export const PostListView: React.FC = memo(() => {
  const { shell } = useAppContext();
  const { showTextInput, confirmDeleteAction } = useObsidianUi();
  const settings = useSettingsStore(
    useShallow((s) => ({
      activeTag: s.activeTag,
      granularity: s.granularity,
      displayMode: s.displayMode,
      dateFilter: s.dateFilter,
      sidebarOpen: s.sidebarOpen,
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

  const { posts: allPosts, loadMore, hasMore, isLoading } = useUnifiedPosts();

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

  const {
    handleClickTime,
    deletePost,
    permanentlyDeletePost,
    movePostToTomorrow,
    archivePost,
    createThread,
    setPostTags,
    setPostPinned,
    copyBlockIdLink,
  } = usePostActions();

  const timelineView = isTimelineView(settings.displayMode);

  const filteredPosts = useFilteredPosts({
    posts: allPosts,
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
            .setTitle(isPinned(post.metadata) ? "ピン留め解除" : "ピン留め")
            .setIcon("pin")
            .setDisabled(isReadOnly)
            .onClick(() => {
              setPostPinned(post, !isPinned(post.metadata));
            }),
        );

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

        sub.addItem((si) =>
          si
            .setTitle("ブロックIDを付与してコピー")
            .setIcon("link")
            .setDisabled(isReadOnly)
            .onClick(() => {
              copyBlockIdLink(post);
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
      setPostPinned,
      setDate,
      setDisplayMode,
      startEdit,
      capabilities.supportsDateNavigation,
      capabilities.supportsMovePostBetweenDays,
      capabilities.supportsTags,
      showTextInput,
      confirmDeleteAction,
      copyBlockIdLink,
    ],
  );

  const displayedPostsWithDividers = useMemo(() => {
    const list: TimelineItem[] = [];
    let lastDate: string | null = null;

    const postsToDisplay = filteredPosts.filter(
      (post) => post.startOffset !== editingPostOffset,
    );

    const pinnedPosts = postsToDisplay.filter((post) => isPinned(post.metadata));
    const unpinnedPosts = postsToDisplay.filter(
      (post) => !isPinned(post.metadata),
    );
    const hasPinnedSection = pinnedPosts.length > 0;

    if (pinnedPosts.length > 0) {
      // 意図: ピン留め投稿は日付グループとは独立して、
      // リスト最上部の専用セクションにまとめて表示する。
      list.push({
        type: "pinned-divider",
        key: "divider-pinned",
      });

      pinnedPosts.forEach((post) => {
        list.push({
          type: "post",
          post,
          key: `post-${post.timestamp.valueOf()}-${post.offset}`,
        });
      });
    }

    unpinnedPosts.forEach((post) => {
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
      const shouldShowTodayDividerAfterPinned = hasPinnedSection && isFirstItem;
      const showDivider =
        shouldShowDividers &&
        isDateChanged &&
        (!isFirstItem || isDateInPast || shouldShowTodayDividerAfterPinned);

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

  const vRef = useRef<VirtualizerHandle>(null);

  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollToTop = useCallback(() => {
    vRef.current?.scrollToIndex(0, { align: "start" });
  }, []);

  // 編集中のポストを現在のリストから再特定する
  // オフセットがズレている可能性があるので、IDなどで再特定して同期する
  useEffect(() => {
    if (editingPostOffset === null) return;
    if (editingPost && editingPost.startOffset === editingPostOffset) return;

    const realPost = allPosts.find((p) => p.startOffset === editingPostOffset);
    if (realPost) {
      setEditingPost(realPost);
    }
  }, [allPosts, editingPostOffset, editingPost, setEditingPost]);

  useEffect(() => {
    shell.on("mfdi:scroll-to-top", scrollToTop);
    return () => {
      shell.off("mfdi:scroll-to-top", scrollToTop);
    };
  }, []);

  // 無限スクロールのトリガー (初期読み込みなどでリストが空の場合のケア)
  useEffect(() => {
    if (threadView) return;
    if (!timelineView || !hasMore) return;

    if (displayedPostsWithDividers.length === 0) {
      loadMore();
    }
  }, [
    timelineView,
    hasMore,
    loadMore,
    displayedPostsWithDividers.length,
    threadView,
  ]);

  return (
    <Box className="list w-full relative">
      <Virtualizer
        ref={vRef}
        scrollRef={scrollContainerRef}
        onScroll={(offset) => setShowScrollTop(offset > 200)}
      >
        {displayedPostsWithDividers.map((item) => (
          <Box
            key={item.key}
            style={{
              paddingBottom: "1px", // 境界線の重なり防止
            }}
          >
            {item.type === "divider" ? (
              <DateDivider date={item.date} />
            ) : item.type === "pinned-divider" ? (
              <PinnedDivider />
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
        ))}
        {timelineView && !threadView && (
          <ListFooter key="footer" hasMore={!!hasMore} loadMore={loadMore} />
        )}
      </Virtualizer>
      <FloatingButton
        className={cn(
          "up-button fixed",
          settings.sidebarOpen ? "right-[calc(8px+300px)]" : "right-8",
        )}
        onClick={() => shell.trigger("mfdi:scroll-to-top")}
        visible={showScrollTop}
      >
        <ObsidianIcon
          className="text-[var(--text-on-accent)] hover:text-[var(--text-on-accent)]"
          name="chevron-up"
          boxSize="1.2em"
        />
      </FloatingButton>
    </Box>
  );
});

const ListFooter = memo(
  ({ hasMore, loadMore }: { hasMore: boolean; loadMore: () => void }) => {
    useEffect(() => {
      if (hasMore) {
        loadMore();
      }
    }, [hasMore, loadMore]);

    return (
      <Box className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-[var(--font-smallest)]">
        {hasMore ? "読み込み中..." : "これ以上投稿はありません"}
      </Box>
    );
  },
);

const PinnedDivider = memo(() => {
  return (
    <Box className="mfdi-date-divider flex items-center py-[var(--size-4-4)] px-[var(--size-4-4)] gap-[var(--size-4-4)]">
      <Box className="flex-1 h-[1px] bg-[var(--background-modifier-border)] opacity-50" />
      <Box className="flex items-center gap-1 text-[length:var(--font-ui-small)] font-semibold text-[var(--text-muted)] whitespace-nowrap tracking-[0.05em] uppercase">
        <ObsidianIcon className="cursor-default" name="pin" boxSize="0.95em" />
        <span>ピン留め</span>
      </Box>
      <Box className="flex-1 h-[1px] bg-[var(--background-modifier-border)] opacity-50" />
    </Box>
  );
});
