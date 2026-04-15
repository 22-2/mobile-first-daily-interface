import React from "react";
import { Card } from "src/ui/components/cards/Card";
import { ObsidianMarkdown } from "src/ui/components/common/ObsidianMarkdown";
import { HStack, Tag } from "src/ui/components/primitives";
import { getPostTags } from "src/ui/utils/post-metadata";
import type { Post } from "src/ui/types";

export const CardView = React.memo(
  ({
    post,
    isSelected = false,
    onEdit,
    onContextMenu,
  }: {
    post: Post;
    isSelected?: boolean;
    onEdit?: (post: Post) => void;
    onContextMenu?: (post: Post, e: React.MouseEvent) => void;
  }) => {
    const tags = getPostTags(post.metadata);

    return (
      <Card
        // 選択中はアクセントカラーのボーダーを表示する
        className={`min-h-[80px] ${isSelected ? "border-[var(--interactive-accent)]" : ""}`}
        onDoubleClick={() => onEdit?.(post)}
        onContextMenu={(e) => onContextMenu?.(post, e)}
      >
        <div className="flex flex-col h-full max-h-[70vh] px-[var(--size-4-2)] py-[var(--size-4-2)]">
          <div className="flex-1 text-[93%] px-1 break-words">
            {post.message.trim() ? (
              <ObsidianMarkdown content={post.message} sourcePath={post.path} />
            ) : (
              // 空メッセージのときはプレースホルダーを表示する
              <span className="text-[var(--text-faint)] italic select-none pointer-events-none">
                テキストを入力...
              </span>
            )}
          </div>

          {tags.length > 0 && (
            <HStack className="flex-wrap justify-end gap-[var(--size-2-3)] pt-[var(--size-2-2)] text-[80%] text-[var(--text-muted)]">
              {tags.map((tag) => (
                <Tag
                  key={tag}
                  className="text-xs px-0 py-0.5 rounded-md bg-[var(--tag-bg)] text-[var(--tag-fg)]"
                >
                  {tag}
                </Tag>
              ))}
            </HStack>
          )}
        </div>
      </Card>
    );
  },
);
