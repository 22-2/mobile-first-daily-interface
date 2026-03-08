import { Menu, Notice } from "obsidian";
import * as React from "react";
import { useMemo } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { useAppContext } from "../context/AppContext";
import { useMFDIContext } from "../context/MFDIAppContext";
import { DeleteConfirmModal } from "../modals/DeleteConfirmModal";
import { PostCardView } from "./PostCardView";

export const PostListView: React.FC = React.memo(() => {
  const { app } = useAppContext();
  const {
    filteredPosts,
    editingPostOffset,
    granularity,
    date: viewedDate,
    timeFilter,
    handleClickTime,
    startEdit,
    deletePost,
    isReadOnly,
  } = useMFDIContext();

  const displayedPosts = useMemo(
    () => filteredPosts.filter((x) => x.startOffset !== editingPostOffset),
    [filteredPosts, editingPostOffset],
  );
  return (
    <TransitionGroup className="list" style={{ padding: "var(--size-4-4) 0" }}>
      {displayedPosts.map((x) => (
        <CSSTransition
          key={x.timestamp.valueOf()}
          timeout={300}
          classNames="item"
        >
          <div>
            <PostCardView
              post={x}
              granularity={granularity}
              viewedDate={viewedDate}
              timeFilter={timeFilter}
              onClickTime={handleClickTime}
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
                    .setTitle("削除")
                    .setIcon("trash")
                    .setWarning(true)
                    .setDisabled(isReadOnly)
                    .onClick(() => {
                      new DeleteConfirmModal(app, () =>
                        deletePost(post),
                      ).open();
                    }),
                );
                menu.showAtMouseEvent(e as unknown as MouseEvent);
              }}
            />
          </div>
        </CSSTransition>
      ))}
    </TransitionGroup>
  );
});
