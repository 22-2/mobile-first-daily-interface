import React, { useEffect, useRef, useState } from "react";
import { Box, Flex, HStack, Spacer, Tag } from "src/ui/components/primitives";
import { useAppStore } from "src/ui/store/appStore";
import {
  DISPLAY_DATE_TIME_FORMAT,
  DISPLAY_TIME_FORMAT,
} from "src/ui/config/date-formats";
import type { DateFilter, Granularity, MomentLike } from "src/ui/types";

interface BaseCardProps {
  timestamp: MomentLike;
  granularity: Granularity;
  dateFilter?: DateFilter;
  showFullTimestamp?: boolean;
  isDimmed: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  footerAddon?: React.ReactNode;
  footerRightAddon?: React.ReactNode;
}

export const BaseCard: React.FC<BaseCardProps> = ({
  timestamp,
  granularity,
  dateFilter,
  showFullTimestamp = false,
  isDimmed,
  onContextMenu,
  onDoubleClick,
  children,
  footerAddon,
  footerRightAddon,
}) => {
  const dimClass = isDimmed ? "opacity-60 filter grayscale" : "";

  // Feature toggle from plugin settings: whether click-to-activate behavior is enabled.
  const clickToActivate = useAppStore(
    (s: any) => s.pluginSettings?.clickToActivateScroll ?? false,
  );

  const [activated, setActivated] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!clickToActivate) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (!rootRef.current.contains(target)) {
        setActivated(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [clickToActivate]);

  return (
    <Flex
      ref={rootRef}
      className={`base-card flex flex-col max-h-[50vh] px-[var(--size-4-2)] py-[var(--size-4-2)] ${dimClass} ${
        clickToActivate && !activated ? "cursor-pointer" : ""
      }`}
      onClick={(e) => {
        if (clickToActivate) {
          setActivated(true);
        }
      }}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      <Box
        className={`flex-1 mfdi-scroll-area ${
          clickToActivate ? (activated ? "activated" : "not-activated") : ""
        }`}>
        {children}
      </Box>

      {/* Footer */}
      <HStack className="footer px-[var(--size-4-1)] text-[var(--text-muted)] text-[80%] pt-0 items-center gap-[var(--size-2-3)]">
        {footerAddon}

        <Spacer />

        <HStack className="tag-list gap-[var(--size-2-1)]">
          {footerRightAddon}
          <Tag className="text-xs px-2 py-0.5 rounded-full bg-[var(--tag-bg)] text-[var(--tag-fg)]">
            {/* fixedノートは複数日が混在しうるので、時刻だけだと投稿の文脈を失う。 */}
            {timestamp.format(
              showFullTimestamp
                ? DISPLAY_DATE_TIME_FORMAT
                : granularity === "day" && dateFilter !== "this_week"
                  ? DISPLAY_TIME_FORMAT
                  : DISPLAY_DATE_TIME_FORMAT,
            )}
          </Tag>
        </HStack>
      </HStack>
    </Flex>
  );
};
