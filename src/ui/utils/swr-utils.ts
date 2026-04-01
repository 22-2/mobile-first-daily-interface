import { mutate } from "swr";
import { unstable_serialize as serializeInfiniteKey } from "swr/infinite";
import { settingsStore } from "src/ui/store/settingsStore";
import type { DisplayMode } from "src/ui/types";
import { isTimelineView } from "src/ui/utils/view-mode";

const SERIALIZED_POSTS_KEY_PREFIX = '@"posts",';
const SERIALIZED_INFINITE_POSTS_KEY_PREFIX =
  `$inf$${SERIALIZED_POSTS_KEY_PREFIX}`;

type RefreshPostsContext = {
  activeTopic: string;
  displayMode: DisplayMode;
  timelineDayKey: string;
  searchQuery: string;
};

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
  // メンタルモデル: SWR 2.x のグローバル mutate(predicate) が見るのは
  // useSWR / useSWRInfinite に渡した元の配列ではなく、cache 内のシリアライズ済み文字列キー。
  // 投稿直後の手動 refresh でも focus revalidate と同じキャッシュ群を拾えるよう、
  // 通常キー `@"posts",...` と infinite 親キー `$inf$@"posts",...` の両方を判定する。
  if (typeof key === "string") {
    return (
      key.startsWith(SERIALIZED_POSTS_KEY_PREFIX) ||
      key.startsWith(SERIALIZED_INFINITE_POSTS_KEY_PREFIX)
    );
  }

  return false;
}

function getRefreshPostsContext(): RefreshPostsContext {
  const { activeTopic, displayMode, date, searchQuery } = settingsStore.getState();
  return {
    activeTopic,
    displayMode,
    timelineDayKey: date.format("YYYY-MM-DD"),
    searchQuery,
  };
}

function getTimelineInfinitePostsKey({
  activeTopic,
  displayMode,
  timelineDayKey,
  searchQuery,
}: RefreshPostsContext): string {
  return serializeInfiniteKey(() => [
    "posts",
    activeTopic,
    displayMode,
    timelineDayKey,
    searchQuery,
    null,
  ]);
}

/**
 * 全ての 'posts' 関連のキャッシュを再検証する。
 */
export async function refreshAllPosts(context = getRefreshPostsContext()) {
  // メンタルモデル: global mutate(predicate) は内部で `$inf$...` の special key を走査対象から外す。
  // そのため通常の posts key 再検証だけでは useSWRInfinite の親キャッシュが更新されず、
  // タイムラインだけ「submit 後は古いまま / focus 復帰でだけ更新」に陥る。
  await mutate((key) => Array.isArray(key) && key[0] === "posts");

  if (!isTimelineView(context.displayMode)) {
    return;
  }

  await mutate(getTimelineInfinitePostsKey(context));
}
