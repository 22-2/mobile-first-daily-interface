import { Box, HStack } from "@chakra-ui/react";
import { FC, ReactNode } from "react";

interface BaseLayoutProps {
    left?: ReactNode;
    right?: ReactNode;
}

export const BaseLayout: FC<BaseLayoutProps> = ({ left, right }) => {
    return (
        <HStack
            fontSize="var(--font-ui-smaller)"
            color="var(--text-muted)"
            marginX="var(--size-4-4)"
            marginY="var(--size-4-2)"
            opacity={0.8}
            spacing={0}
            justifyContent="space-between"
            width="100%"
        >
            <Box>{left}</Box>
            <Box>{right}</Box>
        </HStack>
    );
};
