import { type FC, memo } from "react";
import { getCenterIndicatorLabel } from "src/ui/utils/view-state";
import { Box } from "src/ui/components/primitives";


export const DisplayModeIndicator: FC<{
  displayMode: "focus" | "timeline";
  threadFocusRootId: string | null;
  activeTag: string | null;
  onClick: () => void;
}> = memo(({ displayMode, threadFocusRootId, activeTag, onClick }) => {
  const text = getCenterIndicatorLabel({
    displayMode,
    threadFocusRootId,
    activeTag,
  });
  return (
    <Box
      className="text-[length:var(--font-ui-small)] font-bold text-[var(--text-accent)] cursor-pointer"
      onClick={onClick}
    >
      {text}
    </Box>
  );
});
