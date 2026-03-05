import { Box, Flex, HStack, Spacer, Tag, VStack } from "@chakra-ui/react";
import Markdown from "marked-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { Settings } from "../settings";
import { createMeta, HTMLMeta, ImageMeta, TwitterMeta } from "../utils/meta";
import { pickUrls } from "../utils/strings";
import { isPresent } from "../utils/types";
import { Card } from "./Card";
import {
  DISPLAY_DATE_TIME_FORMAT,
  DISPLAY_TIME_FORMAT,
} from "./date-formats";
import { HTMLCard } from "./HTMLCard";
import { ImageCard } from "./ImageCard";
import { Post } from "./ReactView";
import { TwitterCard } from "./TwitterCard";
import { granularityConfig } from "./granularity-config";
import { Granularity, MomentLike } from "./types";
import { useAppContext } from "./context/AppContext";

export const PostCardView = React.memo(
  ({
    post,
    granularity,
    viewedDate,
    onClickTime,
    onContextMenu,
    onEdit,
  }: {
    post: Post;
    granularity: Granularity;
    viewedDate: MomentLike;
    onClickTime: (post: Post) => void;
    onContextMenu?: (post: Post, e: React.MouseEvent) => void;
    onEdit?: (post: Post) => void;
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
      <Card
        onContextMenu={(e) => onContextMenu?.(post, e)}
        onDoubleClick={() => onEdit?.(post)}
        opacity={isDimmed ? 0.45 : 1}
        filter={isDimmed ? "grayscale(40%)" : "none"}
      >
        <Flex direction="column" maxHeight={"50vh"} padding={"var(--size-4-2)"}>
          <Box
            padding={5}
            paddingTop={4}
            className="markdown-rendered"
            overflowY="auto"
            flex="1"
            sx={{
              "&::-webkit-scrollbar": {
                width: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "transparent",
                borderRadius: "10px",
              },
              "&:hover::-webkit-scrollbar-thumb": {
                backgroundColor: "var(--scrollbar-thumb-bg, rgba(0,0,0,0.1))",
              },
              scrollbarWidth: "none",
              "&:hover": {
                scrollbarWidth: "thin",
              },
            }}
          >
            <VStack align="stretch" gap={3}>
              {/* Message Body */}
              <Box fontSize={"93%"} paddingX={1} wordBreak={"break-word"}>
                <Markdown gfm breaks>
                  {post.message}
                </Markdown>
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
          </Box>

          {/* Footer: Info Tag */}
          <HStack
            color={"var(--text-muted)"}
            fontSize={"80%"}
            padding={3}
            paddingTop={0}
            paddingRight={4}
            align="center"
            gap={3}
          >
            <Spacer />
            <HStack gap={2}>
              <Tag size="sm" variant="subtle" colorScheme="gray">
                {post.timestamp.format(
                  granularity === "day"
                    ? DISPLAY_TIME_FORMAT
                    : DISPLAY_DATE_TIME_FORMAT
                )}
              </Tag>
            </HStack>
          </HStack>
        </Flex>
      </Card>
    );
  }
);

