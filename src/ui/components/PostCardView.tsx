import { Box, VStack } from "@chakra-ui/react";
import * as React from "react";
import { useEffect, useState } from "react";
import { createMeta, HTMLMeta, ImageMeta, TwitterMeta } from "../../utils/meta";
import { pickUrls } from "../../utils/strings";
import { isPresent } from "../../utils/types";
import { granularityConfig } from "../config/granularity-config";
import { useAppContext } from "../context/AppContext";
import { Granularity, MomentLike, Post, TimeFilter } from "../types";
import { BaseCard } from "./BaseCard";
import { Card } from "./cards/Card";
import { HTMLCard } from "./cards/HTMLCard";
import { ImageCard } from "./cards/ImageCard";
import { TwitterCard } from "./cards/TwitterCard";
import { ObsidianMarkdown } from "./ObsidianMarkdown";

export const PostCardView = React.memo(
  ({
    post,
    granularity,
    viewedDate,
    timeFilter,
    onClickTime,
    onContextMenu,
    onEdit,
    className,
    style,
  }: {
    post: Post;
    granularity: Granularity;
    viewedDate: MomentLike;
    timeFilter?: TimeFilter;
    onClickTime: (post: Post) => void;
    onContextMenu?: (post: Post, e: React.MouseEvent) => void;
    onEdit?: (post: Post) => void;
    className?: string;
    style?: React.CSSProperties;
  }) => {
    const { settings } = useAppContext();
    const [htmlMetas, setHtmlMetas] = useState<HTMLMeta[]>([]);
    const [imageMetas, setImageMetas] = useState<ImageMeta[]>([]);
    const [twitterMetas, setTwitterMetas] = useState<TwitterMeta[]>([]);

    useEffect(() => {
      if (!settings.enabledCardView) {
        setHtmlMetas([]);
        setImageMetas([]);
        setTwitterMetas([]);
        return;
      }

      (async function () {
        const urls = pickUrls(post.message);
        const results = (await Promise.all(urls.map(createMeta))).filter(
          isPresent
        );
        setHtmlMetas(results.filter((x): x is HTMLMeta => x.type === "html"));
        setImageMetas(
          results.filter((x): x is ImageMeta => x.type === "image")
        );
        setTwitterMetas(
          results.filter((x): x is TwitterMeta => x.type === "twitter")
        );
      })();
    }, [post.message, settings.enabledCardView]);

    const unit = granularityConfig[granularity].unit;
    const isCurrent = post.timestamp.isSame(window.moment(), unit);
    const isDimmed = !isCurrent;

    return (
      <Card className={className} style={style}>
        <BaseCard
          timestamp={post.timestamp}
          granularity={granularity}
          timeFilter={timeFilter}
          isDimmed={isDimmed}
          onContextMenu={(e) => onContextMenu?.(post, e)}
          onDoubleClick={(e) => onEdit?.(post)}
        >
          <VStack align="stretch" gap={3}>
            {/* Message Body */}
            <Box fontSize={"93%"} paddingX={1} wordBreak={"break-word"}>
              <ObsidianMarkdown
                content={post.message}
                sourcePath={post.path}
              />
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
  }
);
