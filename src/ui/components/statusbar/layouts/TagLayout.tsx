import { Box } from "@chakra-ui/react";
import { FC } from "react";
import { DateDisplay } from "../parts/DateDisplay";
import { ResultCount } from "../parts/ResultCount";
import { TopicDisplay } from "../parts/TopicDisplay";
import { BaseLayout } from "./BaseLayout";

export const TagLayout: FC = () => {
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
