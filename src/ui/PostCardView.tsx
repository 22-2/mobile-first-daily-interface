import * as React from "react";
import { useEffect, useState } from "react";
import { Notice } from "obsidian";
import { Box, HStack, Flex, VStack, Text, IconButton, Tooltip, Spacer, Tag } from "@chakra-ui/react";
import Markdown from "marked-react";
import { CopyIcon, TimeIcon, createIcon } from "@chakra-ui/icons";
import { pickUrls, replaceDayToJa } from "../utils/strings";
import { createMeta, HTMLMeta, ImageMeta, TwitterMeta } from "../utils/meta";
import { isPresent } from "../utils/types";
import { HTMLCard } from "./HTMLCard";
import { ImageCard } from "./ImageCard";
import { TwitterCard } from "./TwitterCard";
import { postToBluesky } from "../clients/bluesky";
import { Settings } from "../settings";
import { Post } from "./ReactView";

const BlueskyIcon = createIcon({
  displayName: "BlueskyIcon",
  viewBox: "5 5 45 45",
  path: (
    <path
      fill="#1185FE"
      d="M27.5,25.73c-1.6-3.1-5.94-8.89-9.98-11.74c-3.87-2.73-5.35-2.26-6.31-1.82c-1.12,0.51-1.32,2.23-1.32,3.24
	c0,1.01,0.55,8.3,0.92,9.51c1.2,4.02,5.45,5.38,9.37,4.94c0.2-0.03,0.4-0.06,0.61-0.08c-0.2,0.03-0.41,0.06-0.61,0.08
	c-5.74,0.85-10.85,2.94-4.15,10.39c7.36,7.62,10.09-1.63,11.49-6.33c1.4,4.69,3.01,13.61,11.35,6.33c6.27-6.33,1.72-9.54-4.02-10.39
	c-0.2-0.02-0.41-0.05-0.61-0.08c0.21,0.03,0.41,0.05,0.61,0.08c3.92,0.44,8.18-0.92,9.37-4.94c0.36-1.22,0.92-8.5,0.92-9.51
	c0-1.01-0.2-2.73-1.32-3.24c-0.97-0.44-2.44-0.91-6.31,1.82C33.44,16.85,29.1,22.63,27.5,25.73z"
    />
  ),
});

export const PostCardView = ({
  post,
  settings,
  onClickTime,
  onContextMenu,
}: {
  post: Post;
  settings: Settings;
  onClickTime: (post: Post) => void;
  onContextMenu?: (post: Post, e: React.MouseEvent) => void;
}) => {
  const [htmlMetas, setHtmlMetas] = useState<HTMLMeta[]>([]);
  const [imageMetas, setImageMetas] = useState<ImageMeta[]>([]);
  const [twitterMetas, setTwitterMetas] = useState<TwitterMeta[]>([]);

  const handleClickCopyIcon = async (text: string) => {
    await navigator.clipboard.writeText(text);
    new Notice("copied");
  };

  const handleClickPostBlueskyIcon = async () => {
    const nt = new Notice("🦋 Blueskyに投稿中...", 30 * 1000);

    // 画像のメタデータを優先するが、Blueskyが両方指定を許容するなら対応するのもアリ
    const meta = imageMetas.length > 0 ? imageMetas.slice(0, 4) : htmlMetas.slice(0, 4);
    try {
      await postToBluesky(
        settings.blueskyIdentifier,
        settings.blueskyAppPassword,
        post.message,
        meta as HTMLMeta | ImageMeta[]
      );
      nt.setMessage("投稿に成功しました");
      await sleep(5 * 1000);
      nt.hide();
    } catch (e) {
      console.error(e);
      nt.setMessage(`投稿に失敗しました\n\n${String(e)}`);
    }
  };

  useEffect(() => {
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
  }, [post.message]);

  return (
    <Box
      borderStyle={"solid"}
      borderRadius={"12px"}
      borderColor={"var(--table-border-color)"}
      borderWidth={"1px"}
      boxShadow={"0 4px 12px rgba(0,0,0,0.06)"}
      marginY={6}
      overflow="hidden"
      transition="all 0.15s ease"
      _hover={{ transform: "translateY(-4px)", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
      onContextMenu={(e) => onContextMenu?.(post, e)}
    >
      <Flex direction="column">
        <Box padding={5} className="markdown-rendered">
          <VStack align="stretch" gap={4}>
            <Box fontSize={"93%"} paddingX={2} wordBreak={"break-word"}>
              <Markdown gfm breaks>
                {post.message}
              </Markdown>
            </Box>

            <Box paddingX={2}>
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
          </VStack>
        </Box>

        <HStack
          color={"var(--text-muted)"}
          fontSize={"80%"}
          padding={3}
          paddingRight={4}
          align="center"
          gap={3}
        >
          <Box cursor="pointer" onClick={() => onClickTime(post)} display="flex" alignItems="center">
            <TimeIcon marginRight={2} />
            <Text>{replaceDayToJa(post.timestamp.format("YYYY-MM-DD(ddd) H:mm:ss"))}</Text>
          </Box>

          <Spacer />

          <HStack gap={2}>
            <Tooltip label="Copy message">
              <IconButton
                aria-label="copy"
                size="sm"
                icon={<CopyIcon />}
                onClick={() => handleClickCopyIcon(post.message)}
                variant="ghost"
              />
            </Tooltip>

            {settings.blueskyIdentifier && settings.blueskyAppPassword ? (
              <Tooltip label="Post to Bluesky">
                <IconButton
                  aria-label="post-bluesky"
                  size="sm"
                  icon={<BlueskyIcon />}
                  onClick={handleClickPostBlueskyIcon}
                  variant="ghost"
                />
              </Tooltip>
            ) : null}

            <Tag size="sm" variant="subtle" colorScheme="gray">
              {imageMetas.length > 0 ? `${imageMetas.length} image` : htmlMetas.length > 0 ? `${htmlMetas.length} link` : "text"}
            </Tag>
          </HStack>
        </HStack>
      </Flex>
    </Box>
  );
};
