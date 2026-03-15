import { Box, VStack } from "@chakra-ui/react";
import { setTooltip } from "obsidian";
import React from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { useAppContext } from "src/ui/context/AppContext";
import { isPastDateReadOnly } from "src/ui/store/slices/settingsSlice";
import { DateFilter, Granularity, Post } from "src/ui/types";

import { BaseCard } from "src/ui/components/BaseCard";
import { Card } from "src/ui/components/cards/Card";
import { HTMLCard } from "src/ui/components/cards/HTMLCard";
import { ImageCard } from "src/ui/components/cards/ImageCard";
import { TwitterCard } from "src/ui/components/cards/TwitterCard";
import { ObsidianMarkdown } from "src/ui/components/ObsidianMarkdown";
import { usePostMetadata } from "src/ui/hooks/usePostMetadata";
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
    const { settings } = useAppContext();

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

    return (
      <Card className={className} style={style}>
        <BaseCard
          timestamp={post.timestamp}
          granularity={granularity}
          dateFilter={dateFilter}
          isDimmed={isDimmed}
          onContextMenu={(e) => onContextMenu?.(post, e)}
          onDoubleClick={() => !isDimmed && onEdit?.(post)}
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
                color={
                  isThreadFocused ? "var(--text-normal)" : "var(--text-muted)"
                }
                _hover={{
                  color: "var(--text-normal)",
                }}
              />
            ) : undefined
          }
        >
          <VStack align="stretch" gap={3}>
            {/* Message Body */}
            <Box fontSize={"93%"} paddingX={1} wordBreak={"break-word"}>
              <ObsidianMarkdown content={post.message} sourcePath={post.path} />
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
