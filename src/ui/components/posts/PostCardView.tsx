import { IconButton, Tooltip, VStack, Box } from "@chakra-ui/react";
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
          footerRightAddon={
            isThreadRoot(post) ? (
              <Tooltip
                label={isThreadFocused ? "スレッド表示を閉じる" : "スレッドを表示"}
                openDelay={250}
              >
                <IconButton
                  aria-label={
                    isThreadFocused ? "スレッド表示を閉じる" : "スレッドを表示"
                  }
                  icon={<ObsidianIcon name="spool" boxSize="1.05em" />}
                  size="xs"
                  minW="auto"
                  h="1.8rem"
                  w="1.8rem"
                  borderRadius="full"
                  variant="ghost"
                  color={
                    isThreadFocused
                      ? "var(--color-accent)"
                      : "var(--text-muted)"
                  }
                  backgroundColor={
                    isThreadFocused
                      ? "color-mix(in srgb, var(--color-accent), transparent 84%)"
                      : "transparent"
                  }
                  _hover={{
                    backgroundColor:
                      "color-mix(in srgb, var(--color-accent), transparent 88%)",
                  }}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onToggleThreadFocus?.(post);
                  }}
                />
              </Tooltip>
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
