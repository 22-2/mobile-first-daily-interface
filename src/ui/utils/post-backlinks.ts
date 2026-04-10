import type { Post } from "src/ui/types";
import { isVisible } from "src/ui/utils/post-metadata";

interface BlockLinkTarget {
  noteTarget: string | null;
  blockId: string;
}

interface PostBlockIndex {
  byPath: Map<string, Post>;
  byNoteName: Map<string, Post[]>;
}

const WIKI_LINK_PATTERN = /!?\[\[([^\]]+)]]/g;

function stripMarkdownExtension(path: string): string {
  return path.replace(/\.md$/i, "");
}

function normalizeNoteTarget(value: string): string {
  return stripMarkdownExtension(value.trim())
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .toLowerCase();
}

function normalizeBlockId(value: string): string {
  return value.trim().toLowerCase();
}

function getNoteName(path: string): string {
  const normalizedPath = normalizeNoteTarget(path);
  return normalizedPath.split("/").at(-1) ?? normalizedPath;
}

function createTargetKey(noteKey: string, blockId: string): string {
  return `${noteKey}#^${normalizeBlockId(blockId)}`;
}

function createPostBlockIndex(posts: Post[]): PostBlockIndex {
  const byPath = new Map<string, Post>();
  const byNoteName = new Map<string, Post[]>();

  for (const post of posts) {
    const blockId = post.metadata.blockId;
    if (!blockId) {
      continue;
    }

    byPath.set(createTargetKey(normalizeNoteTarget(post.path), blockId), post);

    const noteNameKey = createTargetKey(getNoteName(post.path), blockId);
    const current = byNoteName.get(noteNameKey);
    if (current) {
      current.push(post);
    } else {
      byNoteName.set(noteNameKey, [post]);
    }
  }

  return { byPath, byNoteName };
}

function resolveTargetPost(
  sourcePost: Post,
  target: BlockLinkTarget,
  index: PostBlockIndex,
): Post | null {
  if (target.noteTarget == null) {
    return (
      index.byPath.get(
        createTargetKey(normalizeNoteTarget(sourcePost.path), target.blockId),
      ) ?? null
    );
  }

  const normalizedTarget = normalizeNoteTarget(target.noteTarget);
  const exactMatch = index.byPath.get(
    createTargetKey(normalizedTarget, target.blockId),
  );
  if (exactMatch) {
    return exactMatch;
  }

  // 意図: basename だけのリンクは Obsidian が一意なときだけ生成するため、
  // 複数候補がある状態では誤った投稿へ結び付けない。
  if (normalizedTarget.includes("/")) {
    return null;
  }

  const noteNameMatches =
    index.byNoteName.get(createTargetKey(normalizedTarget, target.blockId)) ??
    [];
  return noteNameMatches.length === 1 ? noteNameMatches[0] : null;
}

export function extractBlockLinkTargets(message: string): BlockLinkTarget[] {
  const targets: BlockLinkTarget[] = [];

  for (const match of message.matchAll(WIKI_LINK_PATTERN)) {
    const inner = match[1]?.trim();
    if (!inner) {
      continue;
    }

    const [targetText = ""] = inner.split("|");
    const blockMarkerIndex = targetText.indexOf("#^");
    if (blockMarkerIndex === -1) {
      continue;
    }

    const noteTarget = targetText.slice(0, blockMarkerIndex).trim();
    const blockId = targetText.slice(blockMarkerIndex + 2).trim();
    if (blockId.length === 0) {
      continue;
    }

    targets.push({
      noteTarget: noteTarget.length > 0 ? noteTarget : null,
      blockId,
    });
  }

  return targets;
}

export function buildPostBacklinkCountMap(posts: Post[]): Map<string, number> {
  return buildTargetPostBacklinkCountMap(posts, posts);
}

export function buildTargetPostBacklinkCountMap(
  targetPosts: Post[],
  sourcePosts: Post[],
): Map<string, number> {
  const visibleTargetPosts = targetPosts.filter((post) => isVisible(post.metadata));
  const visibleSourcePosts = sourcePosts.filter((post) => isVisible(post.metadata));
  const index = createPostBlockIndex(visibleTargetPosts);
  const sourceIdsByTargetId = new Map<string, Set<string>>();

  for (const sourcePost of visibleSourcePosts) {
    const referencedTargetIds = new Set<string>();

    for (const target of extractBlockLinkTargets(sourcePost.message)) {
      const targetPost = resolveTargetPost(sourcePost, target, index);
      if (!targetPost || targetPost.id === sourcePost.id) {
        continue;
      }
      referencedTargetIds.add(targetPost.id);
    }

    for (const targetId of referencedTargetIds) {
      const sourceIds = sourceIdsByTargetId.get(targetId);
      if (sourceIds) {
        sourceIds.add(sourcePost.id);
      } else {
        sourceIdsByTargetId.set(targetId, new Set([sourcePost.id]));
      }
    }
  }

  return new Map(
    Array.from(sourceIdsByTargetId.entries(), ([targetId, sourceIds]) => [
      targetId,
      sourceIds.size,
    ]),
  );
}
