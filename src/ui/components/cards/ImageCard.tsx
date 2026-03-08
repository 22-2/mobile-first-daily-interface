import { Box, Image } from "@chakra-ui/react";
import * as React from "react";
import { ImageMeta } from "../../../utils/meta";

export const ImageCard = ({ meta }: { meta: ImageMeta }) => {
  const url = window.URL || window.webkitURL;
  const src = url.createObjectURL(meta.data);
  return (
    <Box
      className="mfdi-image-card"
      position="relative"
      zIndex={1}
      backdropFilter="brightness(101%)"
      marginBottom="var(--size-4-4)"
    >
      <Image
        src={src}
        className="mfdi-image-card-image"
        width="100%"
        objectFit="contain"
        borderRadius="16px"
      />
    </Box>
  );
};

