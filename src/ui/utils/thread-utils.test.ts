import moment from "moment";
import { describe, expect, test } from "vitest";
import { Post } from "src/ui/types";
import {
  countVisibleRootPosts,
  getThreadPosts,
  isThreadReply,
  isThreadRoot,
  sortThreadPosts,
} from "src/ui/utils/thread-utils";

function createPost(overrides: Partial<Post>): Post {
  const timestamp = overrides.timestamp ?? moment("2026-03-15T10:00:00.000Z");
  return {
    id: overrides.id ?? "post-1",
    threadRootId: overrides.threadRootId ?? null,
    timestamp,
    noteDate: overrides.noteDate ?? moment("2026-03-15T00:00:00.000Z"),
    message: overrides.message ?? "message",
    metadata: overrides.metadata ?? {},
    offset: overrides.offset ?? 0,
    startOffset: overrides.startOffset ?? 0,
    endOffset: overrides.endOffset ?? 10,
    bodyStartOffset: overrides.bodyStartOffset ?? 2,
    kind: "thino",
    path: overrides.path ?? "2026-03-15.md",
  };
}

describe("thread-utils", () => {
  test("counts only root-visible posts", () => {
    const posts = [
      createPost({ id: "root-1", threadRootId: "root-1" }),
      createPost({ id: "reply-1", threadRootId: "root-1", startOffset: 20 }),
      createPost({ id: "plain-1", threadRootId: null, startOffset: 40 }),
    ];

    expect(countVisibleRootPosts(posts)).toBe(2);
    expect(isThreadRoot(posts[0])).toBe(true);
    expect(isThreadReply(posts[1])).toBe(true);
  });

  test("extracts and sorts thread posts with root first", () => {
    const root = createPost({
      id: "root-1",
      threadRootId: "root-1",
      timestamp: moment("2026-03-15T10:00:00.000Z"),
    });
    const laterReply = createPost({
      id: "reply-2",
      threadRootId: "root-1",
      timestamp: moment("2026-03-16T01:00:00.000Z"),
      startOffset: 40,
    });
    const earlierReply = createPost({
      id: "reply-1",
      threadRootId: "root-1",
      timestamp: moment("2026-03-15T11:00:00.000Z"),
      startOffset: 20,
    });

    const threadPosts = getThreadPosts([laterReply, root, earlierReply], "root-1");
    expect(sortThreadPosts(threadPosts, "root-1").map((post) => post.id)).toEqual([
      "root-1",
      "reply-1",
      "reply-2",
    ]);
  });
});
