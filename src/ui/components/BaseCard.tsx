import { Box, Flex, HStack, Spacer, Tag } from "src/ui/components/primitives";
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

  return (
    <Flex
      className={`flex flex-col max-h-[50vh] p-[var(--size-4-2)] ${dimClass}`}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      <Box className="p-[var(--size-4-2)] pt-[var(--size-4-1)] overflow-y-auto flex-1 mfdi-scroll-area">
        {children}
      </Box>

      {/* Footer */}
      <HStack className="text-[var(--text-muted)] text-[80%] p-[var(--size-4-3)] pt-0 pr-[var(--size-4-4)] items-center gap-[var(--size-2-3)]">
        {footerAddon}
        <Spacer />
        <HStack className="gap-[var(--size-2-1)]">
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
