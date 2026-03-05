import { App, Menu, Notice } from "obsidian";
import * as React from "react";
import { useMemo } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { DeleteConfirmModal } from "../DeleteConfirmModal";
import { PostCardView } from "../PostCardView";

import { Granularity, MomentLike, Post } from "../types";
import { Settings } from "../../settings";

import { useAppContext } from "../context/AppContext";

interface PostListViewProps {
  filteredPosts: Post[];
  editingPostOffset: number | null;
  granularity: Granularity;
  viewedDate: MomentLike;
  handleClickTime: (post: Post) => void;
  startEdit: (post: Post) => void;
  deletePost: (post: Post) => Promise<void>;
}

export const PostListView: React.FC<PostListViewProps> = React.memo(
  ({
    filteredPosts,
    editingPostOffset,
    granularity,
    viewedDate,
    handleClickTime,
    startEdit,
    deletePost,
  }) => {
    const { app, settings } = useAppContext();
    const displayedPosts = useMemo(
      () => filteredPosts.filter((x) => x.startOffset !== editingPostOffset),
      [filteredPosts, editingPostOffset]
    );
    return (
      <TransitionGroup className="list" style={{ padding: "var(--size-4-4) 0" }}>
        {displayedPosts.map((x) => (
          <CSSTransition
            key={x.timestamp.unix()}
            timeout={100}
            classNames="item"
          >
            <div>
              <PostCardView
                post={x}
                granularity={granularity}
                viewedDate={viewedDate}
                onClickTime={handleClickTime}
                onEdit={startEdit}
                onContextMenu={(post, e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const menu = new Menu();
                  menu.addItem((item) =>
                    item.setTitle("投稿にジャンプ").onClick(() => {
                      handleClickTime(post);
                    })
                  );
                  menu.addItem((item) =>
                    item.setTitle("編集").onClick(() => {
                      startEdit(post);
                    })
                  );
                  menu.addItem((item) =>
                    item.setTitle("コピー").onClick(async () => {
                      await navigator.clipboard.writeText(post.message);
                      new Notice("copied");
                    })
                  );
                  menu.addItem((item) =>
                    item
                      .setTitle("削除")
                      .onClick(() => {
                        new DeleteConfirmModal(app, () => deletePost(post)).open();
                      })
                  );
                  menu.showAtMouseEvent(e as unknown as MouseEvent);
                }}
              />
            </div>
          </CSSTransition>
        ))}
      </TransitionGroup>
    );
  }
);
