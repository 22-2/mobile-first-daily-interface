import { Box, Flex, HStack, Spacer, Tag, VStack } from "@chakra-ui/react";
import Markdown from "marked-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { Settings } from "../settings";
import { createMeta, HTMLMeta, ImageMeta, TwitterMeta } from "../utils/meta";
import { pickUrls } from "../utils/strings";
import { isPresent } from "../utils/types";
import { Card } from "./Card";
import { HTMLCard } from "./HTMLCard";
import { ImageCard } from "./ImageCard";
import { Post } from "./ReactView";
import { TwitterCard } from "./TwitterCard";



export const PostCardView = ({
  post,
  settings,
  onClickTime,
  onContextMenu,
  onEdit,
}: {
  post: Post;
  settings: Settings;
  onClickTime: (post: Post) => void;
  onContextMenu?: (post: Post, e: React.MouseEvent) => void;
  onEdit?: (post: Post) => void;
}) => {
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
      setImageMetas(results.filter((x): x is ImageMeta => x.type === "image"));
      setTwitterMetas(
        results.filter((x): x is TwitterMeta => x.type === "twitter")
      );
    })();
  }, [post.message, settings.enabledCardView]);

  return (
    <Card onContextMenu={(e) => onContextMenu?.(post, e)} onDoubleClick={() => onEdit?.(post)}>
      <Flex direction="column">
        <Box padding={5} paddingTop={4} className="markdown-rendered">
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
              {post.timestamp.format("hh:mm A")}
            </Tag>
            
          </HStack>
        </HStack>
      </Flex>
    </Card>
  );
};
