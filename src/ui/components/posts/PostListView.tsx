import { Menu, Notice } from "obsidian";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { DateDivider } from "src/ui/components/posts/DateDivider";
import { PostCardView } from "src/ui/components/posts/PostCardView";
import { Box } from "src/ui/components/primitives/Box";
import { FloatingButton } from "src/ui/components/primitives/FloatingButton";
import { DISPLAY_MODE, STORAGE_KEYS } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { useEditorRefs } from "src/ui/context/EditorRefsContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { usePostBacklinks } from "src/ui/hooks/usePostBacklinkCounts";
import { useUnifiedPosts } from "src/ui/hooks/useUnifiedPosts";
import { useEditorStore } from "src/ui/store/editorStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { MomentLike, Post } from "src/ui/types";
import { getRawTagMetadata, isPinned } from "src/ui/utils/post-metadata";
import { isThreadReply, isThreadRoot } from "src/ui/utils/thread-utils";
import { isThreadView, isTimelineView } from "src/ui/utils/view-mode";
import { getMFDIViewCapabilities } from "src/ui/view/state";
import { Virtualizer, type VirtualizerHandle } from "virtua";
import { useShallow } from "zustand/shallow";
import { cn } from "src/ui/components/primitives/utils";

type TimelineItem =
  | { type: "post"; post: Post; key: string }
  | {
      type: "divider";
      date: MomentLike;
      key: string;
      groupKey: string;
      collapsed: boolean;
    }
  | {
      type: "pinned-divider";
      key: string;
      groupKey: string;
      collapsed: boolean;
    };

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
      expanded: s.expanded,
    })),
  );

  const { posts: allPosts, loadMore, hasMore, isLoading } = useUnifiedPosts();

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

  const timelineView = isTimelineView(settings.displayMode);

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
  const threadView = isThreadView({ displayMode, threadFocusRootId });
  // 意図: divider折りたたみはタイムライン通常表示時のみ有効にし、
  // 他モードや検索中に投稿が見えなくなる混乱を防ぐ。
  const canCollapseDividers =
    timelineView && !threadView && searchQuery.trim().length === 0;

  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<string[]>(() =>
    storage.get<string[]>(STORAGE_KEYS.COLLAPSED_POST_GROUP_KEYS, []),
  );
  const collapsedGroupSet = useMemo(
    () => new Set(collapsedGroupKeys),
    [collapsedGroupKeys],
  );

  const toggleCollapsedGroup = useCallback(
    (groupKey: string) => {
      if (!canCollapseDividers) {
        return;
      }
      setCollapsedGroupKeys((prev) => {
        const nextSet = new Set(prev);
        if (nextSet.has(groupKey)) {
          nextSet.delete(groupKey);
        } else {
          nextSet.add(groupKey);
        }
        const next = [...nextSet];
        // 意図: 開閉状態を保存し、次回表示時に同じグループ状態を復元する。
        storage.set(STORAGE_KEYS.COLLAPSED_POST_GROUP_KEYS, next);
        return next;
      });
    },
    [canCollapseDividers, storage],
  );

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
            handleHighlightPost(post);
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("投稿のソースにジャンプ")
          .setIcon("code-xml")
          .onClick(() => {
            handleHighlightSource(post);
          }),
      );

      menu.addSeparator();

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
      handleHighlightPost,
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

  const openBacklinkPreviewForPost = useCallback(
    (post: Post) => {
      const sourcePosts = backlinkPosts.get(post.id) ?? [];
      if (sourcePosts.length === 0) {
        return;
      }

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

  const displayedPostsWithDividers = useMemo(() => {
    const list: TimelineItem[] = [];
    let lastDate: string | null = null;
    let currentDateGroupCollapsed = false;

    const postsToDisplay = filteredPosts;

    const pinnedPosts = postsToDisplay.filter((post) =>
      isPinned(post.metadata),
    );
    const unpinnedPosts = postsToDisplay.filter(
      (post) => !isPinned(post.metadata),
    );
    const hasPinnedSection = pinnedPosts.length > 0;
    const pinnedGroupKey = "pinned";
    const isPinnedCollapsed =
      canCollapseDividers && collapsedGroupSet.has(pinnedGroupKey);

    if (pinnedPosts.length > 0) {
      // 意図: ピン留め投稿は日付グループとは独立して、
      // リスト最上部の専用セクションにまとめて表示する。
      list.push({
        type: "pinned-divider",
        key: "divider-pinned",
        groupKey: pinnedGroupKey,
        collapsed: isPinnedCollapsed,
      });

      if (!isPinnedCollapsed) {
        pinnedPosts.forEach((post) => {
          list.push({
            type: "post",
            post,
            key: `post-${post.timestamp.valueOf()}-${post.offset}`,
          });
        });
      }
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
        const groupKey = `date-${currentDate}`;
        currentDateGroupCollapsed =
          canCollapseDividers && collapsedGroupSet.has(groupKey);
        list.push({
          type: "divider",
          date: post.timestamp,
          key: `divider-${currentDate}`,
          groupKey,
          collapsed: currentDateGroupCollapsed,
        });
      } else if (isDateChanged) {
        currentDateGroupCollapsed = false;
      }

      if (!currentDateGroupCollapsed) {
        list.push({
          type: "post",
          post,
          key: `post-${post.timestamp.valueOf()}-${post.offset}`,
        });
      }

      lastDate = currentDate;
    });

    return list;
  }, [
    filteredPosts,
    granularity,
    displayMode,
    dateFilter,
    settings.viewNoteMode,
    canCollapseDividers,
    collapsedGroupSet,
  ]);

  const visibleDividerGroupKeys = useMemo(
    () =>
      displayedPostsWithDividers
        .filter(
          (item): item is Extract<TimelineItem, { groupKey: string }> =>
            item.type === "divider" || item.type === "pinned-divider",
        )
        .map((item) => item.groupKey),
    [displayedPostsWithDividers],
  );

  const hasVisibleDividers = visibleDividerGroupKeys.length > 0;
  const areAllVisibleDividersCollapsed =
    hasVisibleDividers &&
    visibleDividerGroupKeys.every((groupKey) =>
      collapsedGroupSet.has(groupKey),
    );
  const areAllVisibleDividersExpanded =
    hasVisibleDividers &&
    visibleDividerGroupKeys.every(
      (groupKey) => !collapsedGroupSet.has(groupKey),
    );

  const collapseVisibleDividers = useCallback(() => {
    if (!canCollapseDividers) {
      return;
    }
    setCollapsedGroupKeys((prev) => {
      const nextSet = new Set(prev);
      visibleDividerGroupKeys.forEach((groupKey) => {
        nextSet.add(groupKey);
      });
      const next = [...nextSet];
      // 意図: 右クリックメニューからの一括折りたたみ結果も永続化して再表示時に維持する。
      storage.set(STORAGE_KEYS.COLLAPSED_POST_GROUP_KEYS, next);
      return next;
    });
  }, [canCollapseDividers, storage, visibleDividerGroupKeys]);

  const expandVisibleDividers = useCallback(() => {
    if (!canCollapseDividers) {
      return;
    }
    setCollapsedGroupKeys((prev) => {
      const nextSet = new Set(prev);
      visibleDividerGroupKeys.forEach((groupKey) => {
        nextSet.delete(groupKey);
      });
      const next = [...nextSet];
      // 意図: 右クリックメニューからの一括展開結果も永続化して再表示時に維持する。
      storage.set(STORAGE_KEYS.COLLAPSED_POST_GROUP_KEYS, next);
      return next;
    });
  }, [canCollapseDividers, storage, visibleDividerGroupKeys]);

  const handleClickDateDivider = useCallback(
    (date: MomentLike) => {
      if (!capabilities.supportsDateNavigation) {
        return;
      }
      // 意図: dividerを現在日の起点として使い、投稿リストから即座に日付フォーカスへ遷移できるようにする。
      setDate(date.clone());
      setDisplayMode(DISPLAY_MODE.FOCUS);
    },
    [capabilities.supportsDateNavigation, setDate, setDisplayMode],
  );

  const openDailyNoteSourceForDate = useCallback(
    async (date: MomentLike) => {
      if (!capabilities.supportsDateNavigation) {
        return;
      }
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

  const showDividerContextMenu = useCallback(
    (
      event: React.MouseEvent,
      params?: {
        date?: MomentLike;
        groupKey?: string;
        collapsed?: boolean;
      },
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const menu = new Menu();

      if (params?.date) {
        const targetDate = params.date;
        menu.addItem((item) =>
          item
            .setTitle("この日にフォーカス")
            .setIcon("calendar-range")
            .setDisabled(!capabilities.supportsDateNavigation)
            .onClick(() => {
              handleClickDateDivider(targetDate);
            }),
        );

        menu.addItem((item) =>
          item
            .setTitle("この日のソースを開く")
            .setIcon("code-xml")
            .setDisabled(!capabilities.supportsDateNavigation)
            .onClick(() => {
              void openDailyNoteSourceForDate(targetDate);
            }),
        );

        if (params.groupKey) {
          const targetGroupKey = params.groupKey;
          menu.addItem((item) =>
            item
              .setTitle(
                params.collapsed
                  ? "このdividerを展開する"
                  : "このdividerを折りたたむ",
              )
              .setIcon(params.collapsed ? "rows" : "chevron-down")
              .setDisabled(!canCollapseDividers)
              .onClick(() => {
                toggleCollapsedGroup(targetGroupKey);
              }),
          );
        }

        menu.addSeparator();
      }

      menu.addItem((item) =>
        item
          .setTitle("表示中のdividerをすべて折りたたむ")
          .setIcon("chevrons-up-down")
          .setDisabled(
            !canCollapseDividers ||
              !hasVisibleDividers ||
              areAllVisibleDividersCollapsed,
          )
          .onClick(collapseVisibleDividers),
      );

      menu.addItem((item) =>
        item
          .setTitle("表示中のdividerをすべて展開する")
          .setIcon("rows")
          .setDisabled(
            !canCollapseDividers ||
              !hasVisibleDividers ||
              areAllVisibleDividersExpanded,
          )
          .onClick(expandVisibleDividers),
      );

      menu.showAtMouseEvent(event as unknown as MouseEvent);
    },
    [
      canCollapseDividers,
      capabilities.supportsDateNavigation,
      areAllVisibleDividersCollapsed,
      areAllVisibleDividersExpanded,
      collapseVisibleDividers,
      expandVisibleDividers,
      hasVisibleDividers,
      handleClickDateDivider,
      openDailyNoteSourceForDate,
      toggleCollapsedGroup,
    ],
  );

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
    if (!highlightedPost) {
      return;
    }

    const targetIndex = displayedPostsWithDividers.findIndex(
      (item) =>
        item.type === "post" && isSamePostReference(item.post, highlightedPost),
    );
    if (targetIndex === -1) {
      return;
    }

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
        {displayedPostsWithDividers.map((item) => (
          <Box
            key={item.key}
            style={{
              paddingBottom: "1px", // 境界線の重なり防止
            }}
          >
            {item.type === "divider" ? (
              <DateDivider
                date={item.date}
                onClick={() => handleClickDateDivider(item.date)}
                onContextMenu={(event) =>
                  showDividerContextMenu(event, {
                    date: item.date,
                    groupKey: item.groupKey,
                    collapsed: item.collapsed,
                  })
                }
              />
            ) : item.type === "pinned-divider" ? (
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
            ) : (
              (() => {
                const isEditing =
                  editingPost != null
                    ? isSamePostReference(item.post, editingPost)
                    : editingPostOffset !== null &&
                      item.post.startOffset === editingPostOffset;
                const isJumpHighlighted =
                  highlightedPost != null &&
                  isSamePostReference(item.post, highlightedPost);

                return (
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
                );
              })()
            )}
          </Box>
        ))}
        {timelineView && !threadView && (
          <ListFooter key="footer" hasMore={!!hasMore} loadMore={loadMore} />
        )}
        <Box key="bottom-spacer" className="h-[4rem]" />
      </Virtualizer>
      {!settings.expanded && (
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
