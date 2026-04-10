import { setTooltip } from "obsidian";
import React, { useEffect, useState } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { Box, HStack, Tag, VStack } from "src/ui/components/primitives";
import { useAppStore } from "src/ui/store/appStore";
import { isPastDateReadOnly } from "src/ui/store/slices/settingsSlice";
import type { DateFilter, Granularity, Post } from "src/ui/types";
import { PINNED_METADATA_KEY, getPostTags } from "src/ui/utils/post-metadata";

import type { HTMLMeta, ImageMeta, TwitterMeta } from "src/core/meta";
import { createMeta } from "src/core/meta";
import { pickUrls } from "src/core/strings";
import { isPresent } from "src/core/types";
import { CardContent } from "src/ui/components/BaseCard";
import { Card } from "src/ui/components/cards/Card";
import { HTMLCard } from "src/ui/components/cards/HTMLCard";
import { ImageCard } from "src/ui/components/cards/ImageCard";
import { TwitterCard } from "src/ui/components/cards/TwitterCard";
import { ObsidianMarkdown } from "src/ui/components/ObsidianMarkdown";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isThreadRoot } from "src/ui/utils/thread-utils";

export const PostCardView = React.memo(
  ({
    post,
    backlinkCount = 0,
    granularity,
    dateFilter,
    onContextMenu,
    onEdit,
    onOpenBacklinks,
    isHighlighted = false,
    isThreadFocused = false,
    onToggleThreadFocus,
    className,
    style,
  }: {
    post: Post;
    backlinkCount?: number;
    granularity: Granularity;
    dateFilter?: DateFilter;
    onContextMenu?: (post: Post, e: React.MouseEvent) => void;
    onEdit?: (post: Post) => void;
    onOpenBacklinks?: (post: Post) => void;
    isHighlighted?: boolean;
    isThreadFocused?: boolean;
    onToggleThreadFocus?: (post: Post) => void;
    className?: string;
    style?: React.CSSProperties;
  }) => {
    const settings = useAppStore((s) => s.pluginSettings);
    const viewNoteMode = useSettingsStore((s) => s.viewNoteMode);

    const { htmlMetas, imageMetas, twitterMetas } = usePostMetadata(
      post.message,
      settings?.enabledCardView ?? false,
    );

    const isDimmed = isPastDateReadOnly({
      date: post.noteDate,
      granularity,
      allowEditingPastNotes: settings?.allowEditingPastNotes ?? false,
    });
    const threadToggleLabel = isThreadFocused
      ? "スレッド表示を閉じる"
      : "スレッドを表示";
    const tags = getPostTags(post.metadata);
    const backlinkLabel = `被リンク ${backlinkCount}件`;
    const backlinkButtonLabel = `${backlinkLabel}をプレビュー`;
    const footerRightAddon =
      backlinkCount > 0 || isThreadRoot(post) ? (
        <HStack className="items-center gap-[var(--size-2-2)]">
          {backlinkCount > 0 && (
            <Box
              aria-label={backlinkButtonLabel}
              className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[85%] transition-colors hover:bg-[var(--background-modifier-hover)]"
              ref={(ref: HTMLElement | null) => {
                // 意図: footer の数字だけでは意味が伝わりにくいので、
                // アイコンに触れた時点で参照数だと分かるようにする。
                ref && setTooltip(ref, backlinkButtonLabel);
              }}
              onClick={(e: React.MouseEvent<HTMLElement>) => {
                e.stopPropagation();
                onOpenBacklinks?.(post);
              }}
            >
              <ObsidianIcon
                aria-hidden="true"
                className="pointer-events-none px-0 py-0 hover:text-[var(--text-muted)]"
                name="link"
                size="0.95em"
              />
              <Box as="span" className="text-[75%] leading-none">
                {backlinkCount}
              </Box>
            </Box>
          )}

          {isThreadRoot(post) && (
            <ObsidianIcon
              ref={(ref) => {
                ref && setTooltip(ref, threadToggleLabel);
              }}
              name="spool"
              aria-label={threadToggleLabel}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
                onToggleThreadFocus?.(post);
              }}
              size="1.1em"
              // color={isThreadFocused ? "var(--text-normal)" : undefined}
            />
          )}
        </HStack>
      ) : undefined;

    return (
      <Card
        className={[className, isHighlighted ? "mfdi-card--highlighted" : ""]
          .filter(Boolean)
          .join(" ")}
        style={style}
      >
        <CardContent
          timestamp={post.timestamp}
          granularity={granularity}
          dateFilter={dateFilter}
          isDimmed={isDimmed}
          onContextMenu={(e) => onContextMenu?.(post, e)}
          onDoubleClick={() => !isDimmed && onEdit?.(post)}
          footerAddon={
            tags.length > 0 ? (
              <HStack className="footer flex-wrap justify-end gap-[var(--size-2-3)]">
                {/* タグは一覧の識別子なので、視線の終点になる右下へまとめる。 */}
                {tags.map((tag) => (
                  <Tag
                    key={tag}
                    className="text-xs px-0 py-0.5 rounded-md bg-[var(--tag-bg)] text-[var(--tag-fg)]"
                  >
                    {tag}
                  </Tag>
                ))}
              </HStack>
            ) : undefined
          }
          footerRightAddon={
            footerRightAddon
          }
        >
          <VStack align="stretch" gap={3}>
            {/* Message Body */}
            <Box className="text-[93%] px-1 break-words">
              <ObsidianMarkdown content={post.message} sourcePath={post.path} />
            </Box>

            {settings?.enabledCardView && (
              <Box className="px-1">
                {htmlMetas.map((meta) => (
                  <HTMLCard key={meta.originUrl} meta={meta} />
                ))}
                {imageMetas.map((meta) => (
                  <ImageCard key={meta.originUrl} meta={meta} />
                ))}
                {twitterMetas.map((meta) => (
                  <TwitterCard key={meta.url} meta={meta} />
                ))}
              </Box>
            )}
          </VStack>
        </CardContent>
      </Card>
    );
  },
);

const usePostMetadata = (message: string, enabled: boolean) => {
  const [htmlMetas, setHtmlMetas] = useState<HTMLMeta[]>([]);
  const [imageMetas, setImageMetas] = useState<ImageMeta[]>([]);
  const [twitterMetas, setTwitterMetas] = useState<TwitterMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHtmlMetas([]);
      setImageMetas([]);
      setTwitterMetas([]);
      return;
    }

    let isMounted = true;

    (async function () {
      setIsLoading(true);
      const urls = pickUrls(message);
      const results = (await Promise.all(urls.map(createMeta))).filter(
        isPresent,
      );

      if (!isMounted) return;

      setHtmlMetas(
        results.filter((result): result is HTMLMeta => result.type === "html"),
      );
      setImageMetas(
        results.filter(
          (result): result is ImageMeta => result.type === "image",
        ),
      );
      setTwitterMetas(
        results.filter(
          (result): result is TwitterMeta => result.type === "twitter",
        ),
      );
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [message, enabled]);

  return { htmlMetas, imageMetas, twitterMetas, isLoading };
};
