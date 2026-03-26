import { Box } from "@chakra-ui/react";
import { FC } from "react";
import { ResultCount } from "../parts/ResultCount";
import { TopicDisplay } from "../parts/TopicDisplay";
import { BaseLayout } from "./BaseLayout";

export const TimelineLayout: FC = () => {
    return (
        <BaseLayout
            left={null}
            right={
                <Box>
                    <ResultCount />
                    <TopicDisplay />
                </Box>
            }
        />
    );
};
