import React, { useState } from "react";
import { Box } from "src/ui/components/primitives";

interface ReadMoreContentProps {
  // 文字数超過の判定に使うテキスト。呼び出し元が持っている生テキストを渡す。
  text: string;
  // 「続きを読む」を表示する文字数の閾値。
  threshold?: number;
  children: React.ReactNode;
}

export const ReadMoreContent: React.FC<ReadMoreContentProps> = ({
  text,
  threshold = 200,
  children,
}) => {
  // expanded は一度 true になったら false に戻さない（別の場所をクリックしても展開したまま）。
  const [expanded, setExpanded] = useState(false);

  const isOverflowing = text.length > threshold;

  return (
    <>
      <Box
        className={`mfdi-scroll-area ${expanded ? "flex-1 expanded" : "max-h-[6rem] overflow-hidden"}`}
      >
        {children}
      </Box>

      {/* 文字数超過時の「続きを読む」ボタン。展開後は非表示。 */}
      {isOverflowing && !expanded && (
        <Box
          className="mfdi-read-more"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          続きを読む
        </Box>
      )}
    </>
  );
};
