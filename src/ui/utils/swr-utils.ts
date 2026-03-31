import { mutate } from "swr";

/**
 * SWR のキーが 'posts' 関連であるか判定する。
 * SWR 2.x の useSWR (Array) と useSWRInfinite (String with $inf$ prefix) の両方に対応する。
 */
export function isPostsKey(key: unknown): boolean {
  // useSWR の場合 (Array)
  if (Array.isArray(key)) {
    return key[0] === "posts";
  }

  // useSWRInfinite の場合 (String)
  // SWR 2.x では、キャッシュ内のキーはシリアライズされた文字列（先頭に $inf$ が付く場合がある）になる。
  if (typeof key === "string") {
    return key.startsWith("$inf$") && key.includes('"posts"');
  }

  return false;
}

/**
 * 全ての 'posts' 関連のキャッシュを再検証する。
 */
export async function refreshAllPosts() {
  await mutate(isPostsKey);
}
