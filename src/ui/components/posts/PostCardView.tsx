import { Box, HStack, Tag, VStack } from "@chakra-ui/react";
import { setTooltip } from "obsidian";
import React, { useEffect, useState } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { useAppContext } from "src/ui/context/AppContext";
import { isPastDateReadOnly } from "src/ui/store/slices/settingsSlice";
import { DateFilter, Granularity, Post } from "src/ui/types";
import { getPostTags } from "src/ui/utils/post-metadata";

import { BaseCard } from "src/ui/components/BaseCard";
import { Card } from "src/ui/components/cards/Card";
import { HTMLCard } from "src/ui/components/cards/HTMLCard";
import { ImageCard } from "src/ui/components/cards/ImageCard";
import { TwitterCard } from "src/ui/components/cards/TwitterCard";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isThreadRoot } from "src/ui/utils/thread-utils";
import { HTMLMeta, ImageMeta, TwitterMeta, createMeta } from "src/utils/meta";
import { pickUrls } from "src/utils/strings";
import { isPresent } from "src/utils/types";
import { ObsidianMarkdown } from "../ObsidianMarkdown";

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
    const { settings } = useAppContext();
    const viewNoteMode = useSettingsStore((s) => s.viewNoteMode);

    const { htmlMetas, imageMetas, twitterMetas } = usePostMetadata(
      post.message,
      settings.enabledCardView,
    );

    const isDimmed = isPastDateReadOnly({
      date: post.noteDate,
      granularity,
      allowEditingPastNotes: settings.allowEditingPastNotes,
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
              <HStack gap={1} flexWrap="wrap">
                {tags.map((tag) => (
                  <Tag
                    key={tag}
                    size="sm"
                    variant="subtle"
                    colorScheme="gray"
                    borderRadius="md"
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
                padding="4px"
                cursor="pointer"
                size="1.1em"
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                color={isThreadFocused ? "var(--text-normal)" : undefined}
              />
            ) : undefined
          }
        >
          <VStack align="stretch" gap={3}>
            {/* Message Body */}
            <Box fontSize={"93%"} paddingX={1} wordBreak={"break-word"}>
              <ObsidianMarkdown content={post.message} />
            </Box>

            {settings.enabledCardView && (
              <Box paddingX={1}>
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
