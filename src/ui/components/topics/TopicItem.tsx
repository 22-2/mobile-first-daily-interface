import { Badge, Box, Flex, HStack, Input, Text } from "@chakra-ui/react";
import { Menu } from "obsidian";
import type { Topic } from "src/core/topic";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";

interface TopicItemProps {
  topic: Topic;
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onSwitch: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onStartEdit: (id: string, title: string) => void;
  onEditingTitleChange: (title: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
}

export const TopicItem = ({
  topic,
  isActive,
  isEditing,
  editingTitle,
  editInputRef,
  onSwitch,
  onToggleArchive,
  onStartEdit,
  onEditingTitleChange,
  onCommitEdit,
  onCancelEdit,
}: TopicItemProps) => {
  const handleOpenMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const menu = new Menu();

    if (topic.id !== "") {
      if (!isActive) {
        menu.addItem((item) =>
          item
            .setTitle("このトピックに切り替え")
            .setIcon("check")
            .onClick(() => onSwitch(topic.id)),
        );
      }

      menu.addItem((item) =>
        item
          .setTitle("タイトルを変更")
          .setIcon("pencil")
          .onClick(() => {
            onStartEdit(topic.id, topic.title);
            setTimeout(() => editInputRef.current?.focus(), 50);
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle(topic.archived ? "アーカイブ解除" : "アーカイブ")
          .setIcon(topic.archived ? "unarchive" : "archive")
          .onClick(() => onToggleArchive(topic.id)),
      );
    } else if (!isActive) {
      menu.addItem((item) =>
        item
          .setTitle("このトピックに切り替え")
          .setIcon("check")
          .onClick(() => onSwitch(topic.id)),
      );
    }

    menu.showAtMouseEvent(e as unknown as MouseEvent);
  };

  return (
    <Flex
      align="center"
      paddingX="var(--size-4-3)"
      paddingY="var(--size-4-2)"
      cursor="pointer"
      borderRadius="var(--radius-m)"
      backgroundColor={
        isActive
          ? "var(--background-modifier-active-hover)"
          : "var(--background-secondary)"
      }
      opacity={topic.archived ? 0.6 : 1}
      _hover={{
        backgroundColor: "var(--background-modifier-hover)",
        opacity: 1,
      }}
      onDoubleClick={() => onSwitch(topic.id)}
      transition="all 0.15s"
    >
      <Box
        width="3px"
        height="2.5em"
        borderRadius="2px"
        backgroundColor={
          isActive ? "var(--color-accent)" : "var(--background-secondary)"
        }
        marginRight="var(--size-4-3)"
        flexShrink={0}
        transition="background 0.15s"
      />

      <Box flex={1} minWidth={0}>
        {isEditing ? (
          <Input
            ref={editInputRef}
            size="sm"
            value={editingTitle}
            onChange={(e) => onEditingTitleChange(e.target.value)}
            onBlur={onCommitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            autoFocus
            borderColor="var(--color-accent)"
          />
        ) : (
          <>
            <HStack spacing="var(--size-4-2)" align="center">
              <Text
                fontWeight={isActive ? "600" : "400"}
                color="var(--text-normal)"
                lineHeight="1.4"
                isTruncated
              >
                {topic.title}
              </Text>
              {isActive && (
                <Badge
                  colorScheme="blue"
                  fontSize="0.65em"
                  paddingX="0.4em"
                  borderRadius="4px"
                  backgroundColor="var(--color-accent)"
                  color="var(--text-on-accent)"
                >
                  使用中
                </Badge>
              )}
              {topic.archived && !isActive && (
                <Badge
                  fontSize="0.65em"
                  paddingX="0.4em"
                  borderRadius="4px"
                  variant="outline"
                  color="var(--text-faint)"
                  borderColor="var(--background-modifier-border)"
                >
                  アーカイブ
                </Badge>
              )}
            </HStack>
            <Text
              fontSize="var(--font-ui-smaller)"
              color="var(--text-muted)"
              lineHeight="1.4"
              marginTop="1px"
            >
              {topic.id === "" ? "(デフォルト)" : topic.id}
            </Text>
          </>
        )}
      </Box>

      <Flex
        aria-label="メニュー"
        height="24px"
        width="24px"
        justifyContent="center"
        alignItems="center"
        flexShrink={0}
        onClick={handleOpenMenu}
      >
        <ObsidianIcon name="more-horizontal" boxSize="1.1em" />
      </Flex>
    </Flex>
  );
};
