import React from "react";
import { PostCard } from "src/ui/components/posts/PostCard";
import type { Post } from "src/ui/types";
import { getPostTags } from "src/ui/utils/post-metadata";

// Paper Cut のカードは単一ノート内の固定リストなので、
// isDimmed・backlink・thread の概念がなく、granularity は常に "day"。
export const PaperCutCardView = React.memo(
  ({
    post,
    onEdit,
    onContextMenu,
  }: {
    post: Post;
    onEdit?: (post: Post) => void;
    onContextMenu?: (post: Post, e: React.MouseEvent) => void;
  }) => (
    <PostCard
      className="min-h-[100px]"
      message={post.message}
      sourcePath={post.path}
      timestamp={post.timestamp}
      granularity="day"
      tags={getPostTags(post.metadata)}
      onDoubleClick={() => onEdit?.(post)}
      onContextMenu={(e) => onContextMenu?.(post, e)}
    />
  ),
);
