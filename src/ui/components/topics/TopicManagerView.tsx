import {
    Box,
    Button,
    Divider,
    Flex,
    Heading,
    VStack
} from "@chakra-ui/react";
import * as React from "react";
import { Topic } from "src/topic";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { TopicAddForm } from "src/ui/components/topics/TopicAddForm";
import { TopicItem } from "src/ui/components/topics/TopicItem";
import { useTopicManager } from "src/ui/hooks/useTopicManager";

interface TopicManagerViewProps {
  topics: Topic[];
  activeTopic: string;
  onSave: (topics: Topic[], activeTopic: string) => Promise<void>;
  onClose: () => void;
}

export const TopicManagerView = ({
  topics: initialTopics,
  activeTopic: initialActiveTopic,
  onSave: externalOnSave,
}: TopicManagerViewProps) => {
  const {
    topics,
    activeTopic,
    showAddForm,
    setShowAddForm,
    newTitle,
    setNewTitle,
    newId,
    setNewId,
    idError,
    editingId,
    setEditingId,
    editingTitle,
    setEditingTitle,
    editInputRef,
    handleSwitch,
    handleToggleArchive,
    commitTitleEdit,
    handleAddSubmit,
    handleCancelAdd,
    onSave,
  } = useTopicManager(initialTopics, initialActiveTopic, externalOnSave);

  const activeTopics = topics.filter((t) => !t.archived);
  const archivedTopics = topics.filter((t) => t.archived);

  return (
    <VStack align="stretch" spacing={0} paddingBottom="var(--size-4-4)">
      {/* 通常トピック一覧 */}
      <VStack align="stretch" spacing={2}>
        {activeTopics.map((topic) => (
          <TopicItem
            key={topic.id}
            topic={topic}
            isActive={topic.id === activeTopic}
            isEditing={editingId === topic.id}
            editingTitle={editingTitle}
            editInputRef={editInputRef}
            onSwitch={handleSwitch}
            onToggleArchive={handleToggleArchive}
            onStartEdit={(id, title) => {
              setEditingId(id);
              setEditingTitle(title);
            }}
            onEditingTitleChange={setEditingTitle}
            onCommitEdit={commitTitleEdit}
            onCancelEdit={() => setEditingId(null)}
          />
        ))}
      </VStack>

      {/* 追加フォーム */}
      {showAddForm ? (
        <TopicAddForm
          newTitle={newTitle}
          newId={newId}
          idError={idError}
          onTitleChange={setNewTitle}
          onIdChange={setNewId}
          onSubmit={handleAddSubmit}
          onCancel={handleCancelAdd}
        />
      ) : (
        <Button
          marginTop="var(--size-4-3)"
          variant="ghost"
          leftIcon={<ObsidianIcon name="plus" boxSize="1em" />}
          size="sm"
          color="var(--text-muted)"
          _hover={{
            color: "var(--text-normal)",
            backgroundColor: "var(--background-modifier-hover)",
          }}
          justifyContent="flex-start"
          onClick={() => setShowAddForm(true)}
        >
          新しいトピックを追加
        </Button>
      )}

      {/* アーカイブ済み一覧 */}
      {archivedTopics.length > 0 && (
        <VStack align="stretch" spacing={2} marginTop="var(--size-4-6)">
          <Flex align="center" paddingX="var(--size-4-3)">
            <Heading
              size="xs"
              fontSize="0.75rem"
              fontWeight="600"
              color="var(--text-faint)"
              textTransform="uppercase"
              letterSpacing="0.05em"
            >
              アーカイブ済み ({archivedTopics.length})
            </Heading>
            <Box flex={1} marginLeft="var(--size-4-2)">
              <Divider
                borderColor="var(--background-modifier-border)"
                opacity={0.5}
              />
            </Box>
          </Flex>
          <VStack align="stretch" spacing={2}>
            {archivedTopics.map((topic) => (
              <TopicItem
                key={topic.id}
                topic={topic}
                isActive={topic.id === activeTopic}
                isEditing={editingId === topic.id}
                editingTitle={editingTitle}
                editInputRef={editInputRef}
                onSwitch={handleSwitch}
                onToggleArchive={handleToggleArchive}
                onStartEdit={(id, title) => {
                  setEditingId(id);
                  setEditingTitle(title);
                }}
                onEditingTitleChange={setEditingTitle}
                onCommitEdit={commitTitleEdit}
                onCancelEdit={() => setEditingId(null)}
              />
            ))}
          </VStack>
        </VStack>
      )}

      {/* 完了ボタン */}
      <Box
        marginTop="var(--size-4-6)"
        borderTop="1px solid var(--background-modifier-border)"
        paddingTop="var(--size-4-4)"
      >
        <Button
          width="100%"
          variant="solid"
          backgroundColor="var(--color-accent)"
          color="var(--text-on-accent)"
          _hover={{ backgroundColor: "var(--color-accent-2)" }}
          onClick={onSave}
        >
          完了
        </Button>
      </Box>
    </VStack>
  );
};
