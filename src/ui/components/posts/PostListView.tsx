import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { DateDivider } from "src/ui/components/posts/DateDivider";
import { PostCardView } from "src/ui/components/posts/PostCardView";
import { Box } from "src/ui/components/primitives/Box";
import { FloatingButton } from "src/ui/components/primitives/FloatingButton";
import { cn } from "src/ui/components/primitives/utils";
import { DISPLAY_MODE, INPUT_AREA_SIZE } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { useEditorRefs } from "src/ui/context/EditorRefsContext";
import { useCollapsedGroups } from "src/ui/hooks/internal/useCollapsedGroups";
import { useDividerContextMenu } from "src/ui/hooks/internal/useDividerContextMenu";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { usePostContextMenu } from "src/ui/hooks/internal/usePostContextMenu";
import { useTimelineItems } from "src/ui/hooks/internal/useTimelineItems";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { usePostBacklinks } from "src/ui/hooks/usePostBacklinkCounts";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { useEditorStore } from "src/ui/store/editorStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { MomentLike, Post } from "src/ui/types";
import { isThreadView, isTimelineView } from "src/ui/utils/view-mode";
import { getMFDIViewCapabilities } from "src/ui/view/state";
import { Virtualizer, type VirtualizerHandle } from "virtua";
import { useShallow } from "zustand/shallow";

function isSamePostReference(left: Post, right: Post): boolean {
  return (
    left.id === right.id ||
    (left.path === right.path &&
      left.timestamp.valueOf() === right.timestamp.valueOf() &&
      left.message.trim() === right.message.trim())
  );
}

export const PostListView: React.FC = memo(() => {
  const { shell, storage, settings: pluginSettings } = useAppContext();
  const { showTextInput, confirmDeleteAction, openBacklinkPreview } =
    useObsidianUi();
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
      searchQuery: s.searchQuery,
      isReadOnly: s.isReadOnly(),
      timeFilter: s.timeFilter,
      threadFocusRootId: s.threadFocusRootId,
      viewNoteMode: s.viewNoteMode,
      inputAreaSize: s.inputAreaSize,
    })),
  );

  const { posts: allPosts, loadMore, hasMore } = useUnifiedPosts();

  const {
    editingPostOffset,
    editingPost,
    highlightedPost,
    highlightRequestId,
    startEdit,
    setEditingPost,
  } = useEditorStore(
    useShallow((s) => ({
      editingPostOffset: s.editingPostOffset,
      editingPost: s.editingPost,
      highlightedPost: s.highlightedPost,
      highlightRequestId: s.highlightRequestId,
      startEdit: s.startEdit,
      setEditingPost: s.setEditingPost,
    })),
  );

  const { scrollContainerRef } = useEditorRefs();

  const {
    handleHighlightPost,
    handleHighlightSource,
    deletePost,
    permanentlyDeletePost,
    movePostToTomorrow,
    archivePost,
    createThread,
    setPostTags,
    setPostPinned,
    copyBlockIdLink,
  } = usePostActions();

  const { openDailyNoteForDate } = useNoteStore(
    useShallow((s) => ({
      openDailyNoteForDate: s.openDailyNoteForDate,
    })),
  );

  const {
    granularity,
    displayMode,
    dateFilter,
    isReadOnly,
    searchQuery,
    setDate,
    setDisplayMode,
    threadFocusRootId,
    setThreadFocusRootId,
  } = settings;

  const timelineView = isTimelineView(displayMode);
  const threadView = isThreadView({ displayMode, threadFocusRootId });

  const filteredPosts = useFilteredPosts({
    posts: allPosts,
    ...settings,
    includeThreadReplies: true,
  });

  const { countMap: backlinkCounts, postsMap: backlinkPosts } =
    usePostBacklinks(filteredPosts);

  const capabilities = useMemo(
    () => getMFDIViewCapabilities({ noteMode: settings.viewNoteMode }),
    [settings.viewNoteMode],
  );

  // 意図: divider折りたたみはタイムライン通常表示時のみ有効にし、
  // 他モードや検索中に投稿が見えなくなる混乱を防ぐ。
  const canCollapseDividers =
    timelineView && !threadView && searchQuery.trim().length === 0;

  const {
    collapsedGroupSet,
    toggleCollapsedGroup,
    collapseGroups,
    expandGroups,
  } = useCollapsedGroups({ storage, canCollapseDividers });

  const { displayedPostsWithDividers, visibleDividerGroupKeys } =
    useTimelineItems({
      filteredPosts,
      collapsedGroupSet,
      canCollapseDividers,
      displayMode,
      granularity,
      dateFilter,
      viewNoteMode: settings.viewNoteMode,
    });

  const hasVisibleDividers = visibleDividerGroupKeys.length > 0;
  const areAllVisibleDividersCollapsed =
    hasVisibleDividers &&
    visibleDividerGroupKeys.every((k) => collapsedGroupSet.has(k));
  const areAllVisibleDividersExpanded =
    hasVisibleDividers &&
    visibleDividerGroupKeys.every((k) => !collapsedGroupSet.has(k));

  const collapseAll = useCallback(
    () => collapseGroups(visibleDividerGroupKeys),
    [collapseGroups, visibleDividerGroupKeys],
  );
  const expandAll = useCallback(
    () => expandGroups(visibleDividerGroupKeys),
    [expandGroups, visibleDividerGroupKeys],
  );

  const handleClickDateDivider = useCallback(
    (date: MomentLike) => {
      if (!capabilities.supportsDateNavigation) return;
      // 意図: dividerを現在日の起点として使い、投稿リストから即座に日付フォーカスへ遷移できるようにする。
      setDate(date.clone());
      setDisplayMode(DISPLAY_MODE.FOCUS);
    },
    [capabilities.supportsDateNavigation, setDate, setDisplayMode],
  );

  const openDailyNoteSourceForDate = useCallback(
    async (date: MomentLike) => {
      if (!capabilities.supportsDateNavigation) return;
      // 意図: 右クリックから開く日付ノートとUI表示中の日付を一致させ、操作後の文脈ズレを防ぐ。
      setDate(date.clone());
      setDisplayMode(DISPLAY_MODE.FOCUS);
      await openDailyNoteForDate(shell, pluginSettings, date.clone());
    },
    [
      capabilities.supportsDateNavigation,
      setDate,
      setDisplayMode,
      openDailyNoteForDate,
      shell,
      pluginSettings,
    ],
  );

  const openBacklinkPreviewForPost = useCallback(
    (post: Post) => {
      const sourcePosts = backlinkPosts.get(post.id) ?? [];
      if (sourcePosts.length === 0) return;

      // 意図: exact jump は既存の投稿ジャンプロジックに一本化して、
      // modal 側で別の移動実装を持たないようにする。
      openBacklinkPreview({
        targetPost: post,
        sourcePosts,
        onSelectPost: (sourcePost) => {
          handleHighlightPost(sourcePost);
        },
      });
    },
    [backlinkPosts, openBacklinkPreview, handleHighlightPost],
  );

  const { showPostContextMenu } = usePostContextMenu({
    isReadOnly,
    capabilities,
    archivePost,
    createThread,
    deletePost,
    permanentlyDeletePost,
    movePostToTomorrow,
    handleHighlightPost,
    handleHighlightSource,
    setDate,
    setDisplayMode,
    startEdit,
    showTextInput,
    confirmDeleteAction,
    setPostTags,
    setPostPinned,
    copyBlockIdLink,
  });

  const { showDividerContextMenu } = useDividerContextMenu({
    canCollapseDividers,
    capabilities,
    areAllVisibleDividersCollapsed,
    areAllVisibleDividersExpanded,
    hasVisibleDividers,
    handleClickDateDivider,
    openDailyNoteSourceForDate,
    toggleCollapsedGroup,
    collapseAll,
    expandAll,
  });

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

  useEffect(() => {
    if (!highlightedPost) return;

    const targetIndex = displayedPostsWithDividers.findIndex(
      (item) =>
        item.type === "post" && isSamePostReference(item.post, highlightedPost),
    );
    if (targetIndex === -1) return;

    const timer = window.setTimeout(() => {
      vRef.current?.scrollToIndex(targetIndex, { align: "center" });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [displayedPostsWithDividers, highlightedPost, highlightRequestId]);

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
        {displayedPostsWithDividers.map((item) => {
          if (item.type === "divider") {
            return (
              <Box key={item.key} style={{ paddingBottom: "1px" }}>
                <DateDivider
                  date={item.date}
                  onClick={() => toggleCollapsedGroup(item.groupKey)}
                  collapsed={item.collapsed}
                  showCollapseIcon={canCollapseDividers}
                  onContextMenu={(event) =>
                    showDividerContextMenu(event, {
                      date: item.date,
                      groupKey: item.groupKey,
                      collapsed: item.collapsed,
                    })
                  }
                />
              </Box>
            );
          }

          if (item.type === "pinned-divider") {
            return (
              <Box key={item.key} style={{ paddingBottom: "1px" }}>
                <DateDivider
                  label="ピン留め"
                  leadingIconName="pin"
                  collapsed={item.collapsed}
                  showCollapseIcon={canCollapseDividers}
                  onClick={
                    canCollapseDividers
                      ? () => toggleCollapsedGroup(item.groupKey)
                      : undefined
                  }
                  onContextMenu={(event) => showDividerContextMenu(event)}
                />
              </Box>
            );
          }

          // item.type === "post"
          const isEditing =
            editingPost != null
              ? isSamePostReference(item.post, editingPost)
              : editingPostOffset !== null &&
                item.post.startOffset === editingPostOffset;
          const isJumpHighlighted =
            highlightedPost != null &&
            isSamePostReference(item.post, highlightedPost);

          return (
            <Box key={item.key} style={{ paddingBottom: "1px" }}>
              <PostCardView
                post={item.post}
                backlinkCount={backlinkCounts.get(item.post.id) ?? 0}
                granularity={granularity}
                dateFilter={dateFilter}
                isHighlighted={isEditing || isJumpHighlighted}
                onEdit={startEdit}
                onOpenBacklinks={openBacklinkPreviewForPost}
                onContextMenu={showPostContextMenu}
                isThreadFocused={item.post.id === threadFocusRootId}
                onToggleThreadFocus={(post) => {
                  setThreadFocusRootId(
                    threadFocusRootId === post.id ? null : post.id,
                    post.noteDate,
                  );
                }}
              />
            </Box>
          );
        })}
        {timelineView && !threadView && (
          <ListFooter key="footer" hasMore={!!hasMore} loadMore={loadMore} />
        )}
        <Box key="bottom-spacer" className="h-[24rem]" />
      </Virtualizer>
      {settings.inputAreaSize !== INPUT_AREA_SIZE.MAXIMIZED && (
        <FloatingButton
          className={cn(
            "up-button fixed",
            settings.sidebarOpen && capabilities.supportsSidebar
              ? "right-[calc(8px+300px)]"
              : "right-8",
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
      )}
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
