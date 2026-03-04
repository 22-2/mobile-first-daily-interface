import { App, Menu, Notice } from "obsidian";
import * as React from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { DeleteConfirmModal } from "../DeleteConfirmModal";
import { PostCardView } from "../PostCardView";

import { Granularity, MomentLike, Post } from "../types";
import { Settings } from "../../settings";

interface PostListViewProps {
  app: App;
  filteredPosts: Post[];
  editingPostOffset: number | null;
  settings: Settings;
  granularity: Granularity;
  viewedDate: MomentLike;
  handleClickTime: (post: Post) => void;
  startEdit: (post: Post) => void;
  deletePost: (post: Post) => Promise<void>;
}

export const PostListView: React.FC<PostListViewProps> = ({
  app,
  filteredPosts,
  editingPostOffset,
  settings,
  granularity,
  viewedDate,
  handleClickTime,
  startEdit,
  deletePost,
}) => {
  return (
    <TransitionGroup className="list" style={{ padding: "var(--size-4-4) 0" }}>
      {filteredPosts
        .filter((x) => x.startOffset !== editingPostOffset)
        .map((x) => (
          <CSSTransition
            key={x.timestamp.unix()}
            timeout={300}
            classNames="item"
          >
            <PostCardView
              post={x}
              settings={settings}
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
          </CSSTransition>
        ))}
    </TransitionGroup>
  );
};
