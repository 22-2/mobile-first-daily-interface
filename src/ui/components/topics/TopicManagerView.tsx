import { Box, Button, Divider, Flex, Heading, VStack } from "@chakra-ui/react";
import { useCallback, useRef, useState } from "react";
import type { Topic } from "src/core/topic";
import { DEFAULT_TOPIC } from "src/core/topic";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { TopicAddForm } from "src/ui/components/topics/TopicAddForm";
import { TopicItem } from "src/ui/components/topics/TopicItem";

const TOPIC_ID_REGEX = /^[a-z0-9][a-z0-9-]*$/;

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
  } = useTopicManagerViewState(
    initialTopics,
    initialActiveTopic,
    externalOnSave,
  );

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
          leftIcon={
            <ObsidianIcon name="plus" boxSize="var(--mfdi-icon-size-small)" />
          }
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
              fontSize="var(--font-ui-small)"
              fontWeight="600"
              color="var(--text-faint)"
              textTransform="uppercase"
              letterSpacing="var(--mfdi-letter-spacing-tight)"
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

const useTopicManagerViewState = (
  initialTopics: Topic[],
  initialActiveTopic: string,
  onSave: (topics: Topic[], activeTopic: string) => Promise<void>,
) => {
  const [topics, setTopics] = useState<Topic[]>(
    initialTopics.length > 0 ? initialTopics : [DEFAULT_TOPIC],
  );
  const [activeTopic] = useState<string>(initialActiveTopic);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newId, setNewId] = useState("");
  const [idError, setIdError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const isSaving = useRef(false);

  const handleSwitch = useCallback(
    async (topicId: string) => {
      if (isSaving.current) return;
      isSaving.current = true;
      try {
        const updatedTopics = topics.map((topic) =>
          topic.id === topicId ? { ...topic, archived: false } : topic,
        );
        await onSave(updatedTopics, topicId);
      } finally {
        isSaving.current = false;
      }
    },
    [topics, onSave],
  );

  const handleToggleArchive = useCallback((topicId: string) => {
    setTopics((prev) =>
      prev.map((topic) =>
        topic.id === topicId ? { ...topic, archived: !topic.archived } : topic,
      ),
    );
  }, []);

  const commitTitleEdit = useCallback(() => {
    if (editingId === null) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setTopics((prev) =>
      prev.map((topic) =>
        topic.id === editingId ? { ...topic, title: trimmed } : topic,
      ),
    );
    setEditingId(null);
  }, [editingId, editingTitle]);

  const handleAddSubmit = useCallback(() => {
    const trimmedId = newId.trim();
    const trimmedTitle = newTitle.trim();

    if (!trimmedId) {
      setIdError("IDを入力してください");
      return;
    }
    if (!TOPIC_ID_REGEX.test(trimmedId)) {
      setIdError("英小文字・数字・ハイフンのみ使用可（先頭は英数字）");
      return;
    }
    if (topics.some((topic) => topic.id === trimmedId)) {
      setIdError("このIDはすでに使用されています");
      return;
    }

    const newTopic: Topic = {
      id: trimmedId,
      title: trimmedTitle || trimmedId,
    };
    setTopics((prev) => [...prev, newTopic]);
    setNewTitle("");
    setNewId("");
    setIdError("");
    setShowAddForm(false);
  }, [newId, newTitle, topics]);

  const handleCancelAdd = useCallback(() => {
    setNewTitle("");
    setNewId("");
    setIdError("");
    setShowAddForm(false);
  }, []);

  return {
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
    onSave: () => onSave(topics, activeTopic),
  };
};
