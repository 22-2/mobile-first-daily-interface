import { FC } from "react";
import { BaseLayout } from "src/ui/components/statusbar/layouts/BaseLayout";
import { ResultCount } from "src/ui/components/statusbar/parts/ResultCount";
import { TopicDisplay } from "src/ui/components/statusbar/parts/TopicDisplay";

export const TimelineLayout: FC = () => {
  return (
    <BaseLayout
      className="timeline-layout"
      leftItems={null}
      rightItems={
        <>
          <ResultCount />
          <TopicDisplay />
        </>
      }
    />
  );
};
