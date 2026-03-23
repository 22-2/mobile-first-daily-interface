import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { useLiveQuery } from "dexie-react-hooks";
import * as React from "react";
import { MFDIDatabase } from "src/db/mfdi-db";
import { useAppContext } from "src/ui/context/AppContext";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

interface TagCountItem {
  tag: string;
  count: number;
}

export const TagList: React.FC = () => {
  const { appHelper } = useAppContext();
  const { activeTag, setActiveTag } = useSettingsStore(
    useShallow((s) => ({
      activeTag: s.activeTag,
      setActiveTag: s.setActiveTag,
    })),
  );

  const db = React.useMemo(
    () => new MFDIDatabase(appHelper.getAppId()),
    [appHelper],
  );

  React.useEffect(() => {
    return () => {
      db.close();
    };
  }, [db]);

  const items = useLiveQuery(async (): Promise<TagCountItem[]> => {
    const memos = await db.memos.toArray();
    const counts = new Map<string, number>();

    for (const memo of memos) {
      if (memo.archived || memo.deleted) {
        continue;
      }

      for (const tag of memo.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return left.tag.localeCompare(right.tag, "ja");
      });
  }, [db]);

  if (!items || items.length === 0) {
    return null;
  }

  const activeBg = "color-mix(in srgb, var(--color-accent), transparent 85%)";
  const activeColor = "var(--color-accent)";
  const hoverBg = "var(--background-modifier-hover)";

  return (
    <VStack align="stretch" spacing={1} pt={2} className="mfdi-tag-section">
      <Text
        fontSize="11px"
        fontWeight="bold"
        color="var(--text-muted)"
        textTransform="uppercase"
        letterSpacing="0.05em"
        px={2}
        mb={1}
      >
        タグ
      </Text>
      <VStack align="stretch" spacing={0} className="mfdi-tag-list">
        {items.map((item) => {
          const isActive = activeTag === item.tag;

          return (
            <Box
              key={item.tag}
              px={3}
              py={1.5}
              borderRadius="6px"
              bg={isActive ? activeBg : "transparent"}
              color={isActive ? activeColor : "var(--text-normal)"}
              cursor="pointer"
              fontSize="xs"
              fontWeight={isActive ? "bold" : "normal"}
              transition="background-color 0.1s ease"
              _hover={{
                bg: isActive ? activeBg : hoverBg,
              }}
              onClick={() => {
                setActiveTag(isActive ? null : item.tag);
              }}
            >
              <HStack spacing={0} justify="space-between">
                <Text as="span">{item.tag}</Text>
                <Text as="span" color="var(--text-muted)">{item.count}</Text>
              </HStack>
            </Box>
          );
        })}
      </VStack>
    </VStack>
  );
};
