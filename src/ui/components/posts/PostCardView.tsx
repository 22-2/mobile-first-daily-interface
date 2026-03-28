import { setTooltip } from "obsidian";
import React, { useEffect, useState } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { Box, HStack, Tag, VStack } from "src/ui/components/primitives";
import { useAppStore } from "src/ui/store/appStore";
import { isPastDateReadOnly } from "src/ui/store/slices/settingsSlice";
import type { DateFilter, Granularity, Post } from "src/ui/types";
import { getPostTags } from "src/ui/utils/post-metadata";

import type { HTMLMeta, ImageMeta, TwitterMeta } from "src/core/meta";
import { createMeta } from "src/core/meta";
import { pickUrls } from "src/core/strings";
import { isPresent } from "src/core/types";
import { BaseCard } from "src/ui/components/BaseCard";
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
    granularity,
    dateFilter,
    onContextMenu,
    onEdit,
    isThreadFocused = false,
    onToggleThreadFocus,
    className,
    style,
  }: {
    post: Post;
    granularity: Granularity;
    dateFilter?: DateFilter;
    onContextMenu?: (post: Post, e: React.MouseEvent) => void;
    onEdit?: (post: Post) => void;
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

    return (
      <Card className={className} style={style}>
        <BaseCard
          timestamp={post.timestamp}
          granularity={granularity}
          dateFilter={dateFilter}
          showFullTimestamp={viewNoteMode === "fixed"}
          isDimmed={isDimmed}
          onContextMenu={(e) => onContextMenu?.(post, e)}
          onDoubleClick={() => !isDimmed && onEdit?.(post)}
          footerAddon={
            tags.length > 0 ? (
              <HStack className="flex-wrap gap-[var(--size-2-3)]">
                {tags.map((tag) => (
                  <Tag
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-md bg-[var(--tag-bg)] text-[var(--tag-fg)]"
                  >
                    {tag}
                  </Tag>
                ))}
              </HStack>
            ) : undefined
          }
          footerRightAddon={
            isThreadRoot(post) ? (
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
            ) : undefined
          }
        >
          <VStack align="stretch" gap={3}>
            {/* Message Body */}
            <Box className="text-[93%] px-1 break-words">
              <ObsidianMarkdown content={post.message} />
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
        </BaseCard>
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
