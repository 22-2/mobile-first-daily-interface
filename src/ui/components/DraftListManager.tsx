import { Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { Menu } from "obsidian";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { useAppStore } from "src/ui/store/appStore";
import { useShallow } from "zustand/shallow";

interface DraftListManagerProps {
  onClose: () => void;
}

export const DraftListManager: React.FC<DraftListManagerProps> = ({
  onClose,
}) => {
  const { confirmDeleteAction } = useObsidianUi();
  const { drafts, removeDraft, replaceInput } = useAppStore(
    useShallow((s) => ({
      drafts: s.drafts,
      removeDraft: s.removeDraft,
      replaceInput: s.replaceInput,
    })),
  );

  const formatTime = (timestamp: number) => {
    const now = window.moment();
    const target = window.moment(timestamp);
    if (now.isSame(target, "day")) {
      return target.format("HH:mm");
    }
    return target.format("YYYY/MM/DD HH:mm");
  };

  return (
    <Box
      bg="var(--background-primary)"
      color="var(--text-normal)"
      h="100%"
      display="flex"
      flexDirection="column"
    >
      <Box
        display="flex"
        alignItems="center"
        padding="var(--size-4-4)"
        borderBottom="1px solid var(--background-modifier-border)"
        position="relative"
      >
        <Button
          variant="ghost"
          leftIcon={<ObsidianIcon name="chevron-left" size="var(--mfdi-icon-size-small)" />}
          onClick={onClose}
          color="var(--text-accent)"
          fontWeight="bold"
          _hover={{ bg: "transparent", opacity: 0.8 }}
        >
          戻る
        </Button>
        <Box
          position="absolute"
          left="50%"
          transform="translateX(-50%)"
          pointerEvents="none"
        >
          <Text fontWeight="bold" fontSize="lg">
            下書き
          </Text>
        </Box>
      </Box>

      <Flex
        padding="var(--size-4-5)"
        overflowY="auto"
        flex="1"
        flexDirection="column"
        className="mfdi-draft-list"
      >
        {drafts.length === 0 ? (
          <Flex
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            flex="1"
            color="var(--text-faint)"
            gap="var(--size-4-6)"
          >
            <ObsidianIcon name="file-x" size="var(--mfdi-icon-size-xxlarge)" opacity={0.3} />
            <Text fontSize="md" opacity={0.6} fontWeight="bold">
              下書きはありません
            </Text>
          </Flex>
        ) : (
          <VStack spacing="var(--size-4-4)" align="stretch">
            {drafts.map((draft) => (
              <Box
                key={draft.id}
                p="var(--size-4-5)"
                bg="var(--background-secondary)"
                borderRadius="15px"
                transition="all 0.2s"
                border="1px solid transparent"
                _hover={{
                  bg: "var(--background-modifier-hover)",
                  borderColor: "var(--background-modifier-border)",
                }}
              >
                <HStack justify="space-between" mb="var(  --size-4-2)" align="center">
                  <Text
                    fontSize="xs"
                    color="var(--text-muted)"
                    fontWeight="bold"
                  >
                    {formatTime(draft.createdAt)}
                  </Text>
                  <ObsidianIcon
                    name="more-horizontal"
                    size="var(--mfdi-icon-size-small)"
                    onClick={(e) => {
                      const menu = new Menu();
                      menu.addItem((item) => {
                        item
                          .setTitle("コピー")
                          .setIcon("copy")
                          .onClick(() => {
                            navigator.clipboard.writeText(draft.content);
                          });
                      });

                      menu.addSeparator();

                      menu.addItem((item) => {
                        item
                          .setTitle("復元")
                          .setIcon("refresh-cw")
                          .onClick(() => {
                            replaceInput(draft.content);
                            onClose();
                          });
                      });
                      menu.addItem((item) => {
                        item
                          .setTitle("削除")
                          .setIcon("trash")
                          .setWarning(true)
                          .onClick(() => {
                            confirmDeleteAction(async () => {
                              removeDraft(draft.id);
                            });
                          });
                      });
                      menu.showAtPosition({
                        x: e.clientX,
                        y: e.clientY,
                      });
                      e.stopPropagation();
                    }}
                    color="var(--text-muted)"
                    _hover={{ color: "var(--text-normal)", bg: "transparent" }}
                  />
                </HStack>
                <Text
                  fontSize="sm"
                  lineHeight="1.4"
                  userSelect="text"
                  color="var(--text-normal)"
                  noOfLines={3}
                >
                  {draft.content}
                </Text>
              </Box>
            ))}
          </VStack>
        )}
      </Flex>
    </Box>
  );
};
