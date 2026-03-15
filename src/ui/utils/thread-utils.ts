import { MomentLike, Post } from "src/ui/types";

export const THREAD_METADATA_KEYS = {
  ID: "mfdiId",
  PARENT_ID: "parentId",
} as const;

export function createThreadId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) {
    return randomUuid.replace(/-/g, "").slice(0, 8);
  }

  return Math.random().toString(16).slice(2, 10).padEnd(8, "0").slice(0, 8);
}

export function resolvePostId(
  metadata: Record<string, string> | undefined,
  path: string,
  startOffset: number,
): string {
  return metadata?.[THREAD_METADATA_KEYS.ID] ?? `${path}:${startOffset}`;
}

export function resolveThreadRootId(
  metadata: Record<string, string> | undefined,
): string | null {
  return (
    metadata?.[THREAD_METADATA_KEYS.PARENT_ID] ??
    metadata?.[THREAD_METADATA_KEYS.ID] ??
    null
  );
}

export function isThreadReply(post: Post): boolean {
  return post.threadRootId != null && post.threadRootId !== post.id;
}

export function isThreadRoot(post: Post): boolean {
  return post.threadRootId != null && post.threadRootId === post.id;
}

export function isVisibleRootPost(post: Post): boolean {
  return !isThreadReply(post);
}

export function countVisibleRootPosts(posts: Post[]): number {
  return posts.filter(isVisibleRootPost).length;
}

export function getThreadPosts(posts: Post[], rootId: string): Post[] {
  return posts.filter((post) => post.threadRootId === rootId);
}

export function sortPostsDescending(posts: Post[]): Post[] {
  return [...posts].sort((left, right) => {
    const byTimestamp = right.timestamp.valueOf() - left.timestamp.valueOf();
    if (byTimestamp !== 0) {
      return byTimestamp;
    }
    return right.startOffset - left.startOffset;
  });
}

export function sortThreadPosts(posts: Post[], rootId: string): Post[] {
  const threadPosts = posts.filter((post) => post.threadRootId === rootId);
  return sortPostsDescending(threadPosts);
}

export function buildPostFromEntry(params: {
  time: string;
  message: string;
  metadata: Record<string, string>;
  offset: number;
  startOffset: number;
  endOffset: number;
  bodyStartOffset: number;
  path: string;
  noteDate: MomentLike;
  resolveTimestamp: (
    time: string,
    date: MomentLike,
    metadata?: Record<string, string>,
  ) => MomentLike;
}): Post {
  const {
    time,
    message,
    metadata = {},
    offset,
    startOffset,
    endOffset,
    bodyStartOffset,
    path,
    noteDate,
    resolveTimestamp,
  } = params;

  return {
    id: resolvePostId(metadata, path, startOffset),
    threadRootId: resolveThreadRootId(metadata),
    timestamp: resolveTimestamp(time, noteDate, metadata),
    noteDate,
    message,
    metadata,
    offset,
    startOffset,
    endOffset,
    bodyStartOffset,
    kind: "thino" as const,
    path,
  };
}
