import { renderHook } from "@testing-library/react";
import moment from "moment";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { Post } from "src/ui/types";
import { describe, expect, test } from "vitest";

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

describe("useFilteredPosts", () => {
  test("通常表示ではスレッド返信を隠す", () => {
    const posts = [
      createPost({ id: "reply-1", threadRootId: "root-1", startOffset: 20 }),
      createPost({ id: "root-1", threadRootId: "root-1" }),
      createPost({ id: "plain-1", startOffset: 40 }),
    ];

    const { result } = renderHook(() =>
      useFilteredPosts({
        posts,
        timeFilter: "all",
        dateFilter: "today",
        asTask: false,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: null,
      }),
    );

    expect(result.current.map((post) => post.id)).toEqual([
      "root-1",
      "plain-1",
    ]);
  });

  test("スレッド表示では親と子だけを返す", () => {
    const posts = [
      createPost({ id: "plain-1", startOffset: 40 }),
      createPost({
        id: "reply-2",
        threadRootId: "root-1",
        timestamp: moment("2026-03-16T01:00:00.000Z"),
        startOffset: 60,
      }),
      createPost({ id: "root-1", threadRootId: "root-1" }),
      createPost({
        id: "reply-1",
        threadRootId: "root-1",
        timestamp: moment("2026-03-15T12:00:00.000Z"),
        startOffset: 20,
      }),
    ];

    const { result } = renderHook(() =>
      useFilteredPosts({
        posts,
        timeFilter: "all",
        dateFilter: "today",
        asTask: false,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: "root-1",
        includeThreadReplies: true,
      }),
    );

    expect(result.current.map((post) => post.id)).toEqual([
      "reply-2",
      "reply-1",
      "root-1",
    ]);
  });
});
