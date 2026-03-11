import { useEffect, useState } from "react";
import { createMeta, HTMLMeta, ImageMeta, TwitterMeta } from "src/utils/meta";
import { pickUrls } from "src/utils/strings";
import { isPresent } from "src/utils/types";

export const usePostMetadata = (message: string, enabled: boolean) => {
  const [htmlMetas, setHtmlMetas] = useState<HTMLMeta[]>([]);
  const [imageMetas, setImageMetas] = useState<ImageMeta[]>([]);
  const [twitterMetas, setTwitterMetas] = useState<TwitterMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHtmlMetas([]);
      setImageMetas([]);
      setTwitterMetas([]);
      return;
    }

    let isMounted = true;

    (async function () {
      setIsLoading(true);
      const urls = pickUrls(message);
      const results = (await Promise.all(urls.map(createMeta))).filter(
        isPresent,
      );
      
      if (!isMounted) return;

      setHtmlMetas(results.filter((x): x is HTMLMeta => x.type === "html"));
      setImageMetas(
        results.filter((x): x is ImageMeta => x.type === "image"),
      );
      setTwitterMetas(
        results.filter((x): x is TwitterMeta => x.type === "twitter"),
      );
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [message, enabled]);

  return { htmlMetas, imageMetas, twitterMetas, isLoading };
};
