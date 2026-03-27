import type { FC } from "react";
import { Box } from "src/ui/components/primitives";
import { BaseLayout } from "src/ui/components/statusbar/layouts/BaseLayout";
import { DateDisplay } from "src/ui/components/statusbar/parts/DateDisplay";
import { ResultCount } from "src/ui/components/statusbar/parts/ResultCount";
import { TopicDisplay } from "src/ui/components/statusbar/parts/TopicDisplay";

export const FocusLayout: FC = () => {
  return (
    <BaseLayout
      leftItems={<DateDisplay />}
      rightItems={
        <Box>
          <ResultCount />
          <TopicDisplay />
        </Box>
      }
    />
  );
};
