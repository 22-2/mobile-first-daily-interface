import { useEffect, useState } from "react";

const TARGET_SELECTOR = '[data-type="mfdi-view"] .cm-scroller';

function hasExpectedScrollerStyle(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const scroller = document.querySelector<HTMLElement>(TARGET_SELECTOR);
  return scroller
    ? window.getComputedStyle(scroller).maxHeight === "500px"
    : false;
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
