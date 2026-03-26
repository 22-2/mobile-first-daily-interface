import { HStack, Text, VStack } from "@chakra-ui/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { MFDIDatabase } from "src/db/mfdi-db";
import {
  SidebarSectionHeader,
  SidebarTextButton,
} from "src/ui/components/layout/SidebarPrimitives";
import { useAppContext } from "src/ui/context/AppContext";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

import { useMFDIDB } from "src/ui/hooks/useMFDIDB";

interface TagCountItem {
  tag: string;
  count: number;
}

interface TagListSnapshot {
  items: TagCountItem[] | null;
  hasCompletedFullScan: boolean;
}

export const TagList: React.FC = () => {
  const { activeTag, setActiveTag } = useSettingsStore(
    useShallow((s) => ({
      activeTag: s.activeTag,
      setActiveTag: s.setActiveTag,
    })),
  );

  const db = useMFDIDB();

  const snapshot = useLiveQuery(
    async (): Promise<TagListSnapshot> => {
      if (!db) {
        return { items: null, hasCompletedFullScan: false };
      }

      const [tagStats, lastFullScanAt] = await Promise.all([
        db.tagStats.toArray(),
        db.meta.get("lastFullScanAt"),
      ]);

      return {
        items: tagStats
          .map(({ tag, count }) => ({ tag, count }))
          .sort((left, right) => {
            if (right.count !== left.count) {
              return right.count - left.count;
            }
            return left.tag.localeCompare(right.tag, "ja");
          }),
        hasCompletedFullScan: lastFullScanAt != null,
      };
    },
    [db],
    {
      items: null,
      hasCompletedFullScan: false,
    },
  );

  const [stableItems, setStableItems] = useState<TagCountItem[] | null>(null);

  useEffect(() => {
    if (snapshot.items == null) {
      return;
    }

    if (snapshot.items.length > 0) {
      setStableItems(snapshot.items);
      return;
    }

    if (snapshot.hasCompletedFullScan) {
      setStableItems([]);
    }
  }, [snapshot]);

  const items = stableItems ?? snapshot.items;

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <VStack align="stretch" spacing={1} pt={2} className="mfdi-tag-section">
      <SidebarSectionHeader>タグ</SidebarSectionHeader>
      <VStack align="stretch" spacing={0} className="mfdi-tag-list">
        {items.map((item) => {
          const isActive = activeTag === item.tag;

          return (
            <SidebarTextButton
              key={item.tag}
              isSelected={isActive}
              onClick={() => {
                setActiveTag(isActive ? null : item.tag);
              }}
            >
              <HStack spacing={0} justify="space-between">
                <Text as="span">{item.tag}</Text>
                <Text as="span" color="var(--text-muted)">
                  {item.count}
                </Text>
              </HStack>
            </SidebarTextButton>
          );
        })}
      </VStack>
    </VStack>
  );
};
