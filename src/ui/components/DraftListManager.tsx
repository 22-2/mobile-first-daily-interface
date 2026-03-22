import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import * as React from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { useAppStore } from "src/ui/store/appStore";
import { Menu } from "obsidian";
import { useShallow } from "zustand/shallow";
import { DeleteConfirmModal } from "src/ui/modals/DeleteConfirmModal";

export interface DraftListManagerProps {
  onClose: () => void;
}

export const DraftListManager: React.FC<DraftListManagerProps> = ({
  onClose,
}) => {
  const { drafts, removeDraft, replaceInput, app } = useAppStore(
    useShallow((s) => ({
      drafts: s.drafts,
      removeDraft: s.removeDraft,
      replaceInput: s.replaceInput,
      app: s.app!,
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
        padding="1em"
        borderBottom="1px solid var(--background-modifier-border)"
        position="relative"
      >
        <Button
          variant="ghost"
          leftIcon={<ObsidianIcon name="chevron-left" size="1.2em" />}
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
        padding="1.2em"
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
            gap="1.5em"
          >
            <ObsidianIcon name="file-x" size="4em" opacity={0.3} />
            <Text fontSize="md" opacity={0.6} fontWeight="bold">
              下書きはありません
            </Text>
          </Flex>
        ) : (
          <VStack spacing="1em" align="stretch">
            {drafts.map((draft) => (
              <Box
                key={draft.id}
                p="1.2em"
                bg="var(--background-secondary)"
                borderRadius="15px"
                transition="all 0.2s"
                border="1px solid transparent"
                _hover={{
                  bg: "var(--background-modifier-hover)",
                  borderColor: "var(--background-modifier-border)",
                }}
              >
                <HStack justify="space-between" mb="0.4em" align="center">
                  <Text
                    fontSize="xs"
                    color="var(--text-muted)"
                    fontWeight="bold"
                  >
                    {formatTime(draft.createdAt)}
                  </Text>
                  <ObsidianIcon
                    name="more-horizontal"
                    size="1.2em"
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
                            new DeleteConfirmModal(app, async () => {
                              removeDraft(draft.id);
                            }).open();
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
