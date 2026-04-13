import { useEffect, useState } from "react";

const TARGET_SELECTOR = '[data-type="mfdi-view"]';

function hasExpectedScrollerStyle(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const viewRoot = document.querySelector<HTMLElement>(TARGET_SELECTOR);
  if (!viewRoot) {
    return false;
  }

  const cssLoadedMarker = window
    .getComputedStyle(viewRoot)
    .getPropertyValue("--mfdi-css-loaded")
    .trim();

  return cssLoadedMarker === "1";
}

export function useCSSLoaded() {
  const [isCSSLoaded, setIsCSSLoaded] = useState<boolean>(false);

  useEffect(() => {
    // 初回チェック
    if (hasExpectedScrollerStyle()) {
      setIsCSSLoaded(true);
      return;
    }
    const handleFrame = () => {
      const isLoaded = hasExpectedScrollerStyle();

      if (isLoaded) {
        requestAnimationFrame(() => {
          setIsCSSLoaded(true);
          cancelAnimationFrame(raf); // ロード済みになったらインターバル止めるっす
        });
      } else {
        raf = requestAnimationFrame(handleFrame); // ロードされてなければ次のフレームで再チェック
      }
    };

    let raf = requestAnimationFrame(handleFrame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return isCSSLoaded;
}
