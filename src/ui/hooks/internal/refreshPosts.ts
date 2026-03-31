import { mutate } from "swr";
import type { DisplayMode } from "src/ui/types";
import { isPostsKey } from "src/ui/utils/swr-utils";

type RefreshPosts = (path?: string) => Promise<void>;

interface RefreshPostsDeps {
  activeTopic: string;
  displayMode: DisplayMode;
}

/**
 * データの変更（投稿・編集・削除）があった際に、SWRのキャッシュを無効化する。
 */
export function createRefreshPosts({
  activeTopic,
  displayMode,
}: RefreshPostsDeps): RefreshPosts {
  return async () => {
    // 全ての 'posts' に関連するキーを再検証する
    await mutate(isPostsKey);
  };
}
