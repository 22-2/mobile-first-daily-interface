import { Box, VStack } from "@chakra-ui/react";
import * as React from "react";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { useAppContext } from "src/ui/context/AppContext";
import { useSettingsStore } from "src/ui/store/settingsStore";
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
    const isReadOnly = useSettingsStore((s) => s.isReadOnly());

    const { htmlMetas, imageMetas, twitterMetas } = usePostMetadata(
      post.message,
      settings.enabledCardView,
    );

    const { unit } = GRANULARITY_CONFIG[granularity];
    const isToday = post.timestamp.isSame(window.moment(), unit);
    // 過去の投稿は薄くする
    const isDimmed = post.timestamp.isBefore(window.moment(), unit);

    return (
      <Card className={className} style={style}>
        <BaseCard
          timestamp={post.timestamp}
          granularity={granularity}
          dateFilter={dateFilter}
          isDimmed={isDimmed}
          onContextMenu={(e) => onContextMenu?.(post, e)}
          onDoubleClick={(e) => !isDimmed && onEdit?.(post)}
          footerAddon={
            isThreadRoot(post) ? (
              <Box
                as="button"
                type="button"
                aria-label={isThreadFocused ? "スレッド表示を閉じる" : "スレッドを表示"}
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="full"
                padding={1}
                color={isThreadFocused ? "var(--color-accent)" : "var(--text-muted)"}
                backgroundColor={
                  isThreadFocused
                    ? "color-mix(in srgb, var(--color-accent), transparent 82%)"
                    : "transparent"
                }
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.stopPropagation();
                  onToggleThreadFocus?.(post);
                }}
              >
                <ObsidianIcon name="spool" boxSize="1.1em" />
              </Box>
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
