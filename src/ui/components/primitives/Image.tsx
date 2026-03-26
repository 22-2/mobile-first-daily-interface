import React, { useState } from "react";

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

export const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  function Image({ fallbackSrc, onError, ...rest }, ref) {
    const [errored, setErrored] = useState(false);

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setErrored(true);
      if (onError) onError(e);
    };

    if (errored && fallbackSrc) {
      return <img ref={ref} src={fallbackSrc} {...rest} />;
    }

    return <img ref={ref} onError={handleError} {...rest} />;
  },
);

Image.displayName = "Image";
