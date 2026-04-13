import { useEffect, useState } from "react";

const TARGET_SELECTOR = '[data-type="mfdi-view"] .cm-scroller';

function hasExpectedScrollerStyle(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const scroller = document.querySelector<HTMLElement>(TARGET_SELECTOR);
  if (!scroller) {
    return false;
  }

  const { maxHeight } = window.getComputedStyle(scroller);
  // 意図: max-height の具体値は設定変更で変わるため、固定値一致ではなく
  // 「none/未設定ではない」ことを CSS 適用完了のシグナルとして扱う。
  return maxHeight !== "" && maxHeight !== "none" && maxHeight !== "0px";
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
