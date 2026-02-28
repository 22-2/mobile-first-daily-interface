import { Box, Image, Link, Text } from "@chakra-ui/react";
import parse from "html-react-parser";
import * as React from "react";
import { TwitterMeta } from "../utils/meta";

export const TwitterCard = ({ meta }: { meta: TwitterMeta }) => {
  return (
    <Box
      className="mfdi-html-card"
      position="relative"
      zIndex={1}
      border="1px dotted #b5890077"
      backdropFilter="brightness(101%)"
      marginBottom="var(--size-4-4)"
      borderRadius="16px"
      overflow="hidden"
      transition="backdrop-filter 0.2s"
      _hover={{
        cursor: "pointer",
        border: "1px solid #b58900",
        backdropFilter: "brightness(98%)",
      }}
    >
      <Box className="mfdi-html-card-content" padding="var(--size-4-4)">
        <Box
          className="mfdi-html-card-header"
          marginBottom="var(--size-4-2)"
          color="var(--text-muted)"
          display="flex"
          alignItems="center"
        >
          <Image
            src="https://abs.twimg.com/favicons/twitter.3.ico"
            className="mfdi-html-card-site-icon"
            objectFit="contain"
            height="1em"
            marginRight="var(--size-2-3)"
          />
          <Text
            className="mfdi-html-card-site-name"
            height="1em"
            lineHeight="1em"
          >
            X / Twitter
          </Text>
        </Box>
        <Box className="mfdi-html-card-body">{parse(meta.html)}</Box>
      </Box>
      <Link
        href={meta.url}
        isExternal
        position="absolute"
        top={0}
        left={0}
        width="100%"
        height="100%"
        textIndent="-9999px"
        zIndex={2}
      />
    </Box>
  );
};

