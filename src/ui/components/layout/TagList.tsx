import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import {
  SidebarItemCount,
  SidebarSectionHeader,
  SidebarTextButton,
} from "src/ui/components/layout/SidebarPrimitives";
import { HStack, Text, VStack } from "src/ui/components/primitives";
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

      // db is a remote IDBService exposed from the worker; use the
      // provided methods instead of accessing Dexie internals.
      const [tagStats, lastFullScanAt] = await Promise.all([
        db.getTagStats(),
        db.getMeta("lastFullScanAt"),
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
    <VStack className="mfdi-tag-section gap-2 pt-2 items-stretch">
      <SidebarSectionHeader>タグ</SidebarSectionHeader>
      <VStack className="mfdi-tag-list gap-0 items-stretch">
        {items.map((item) => {
          const isActive = activeTag === item.tag;

          return (
            <SidebarTextButton
              key={item.tag}
              isSelected={isActive}
              className={`mfdi-scale-item mfdi-scale-item-tag ${isActive ? "is-selected" : ""}`}
              onClick={() => {
                setActiveTag(isActive ? null : item.tag);
              }}
            >
              <HStack className="w-full gap-0 justify-between">
                <Text as="span">{item.tag}</Text>
                <SidebarItemCount>{item.count}</SidebarItemCount>
              </HStack>
            </SidebarTextButton>
          );
        })}
      </VStack>
    </VStack>
  );
};
