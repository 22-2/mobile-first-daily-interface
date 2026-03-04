import {
    Badge,
    Box,
    Button,
    Divider,
    Flex,
    FormControl,
    FormErrorMessage,
    FormHelperText,
    FormLabel,
    HStack,
    IconButton,
    Input,
    Text,
    VStack
} from "@chakra-ui/react";
import { Menu } from "obsidian";
import * as React from "react";
import { useRef, useState } from "react";
import { DEFAULT_TOPIC, Topic } from "../topic";
import { ObsidianIcon } from "./ObsidianIcon";

interface TopicManagerViewProps {
  topics: Topic[];
  activeTopic: string;
  onSave: (topics: Topic[], activeTopic: string) => Promise<void>;
  onClose: () => void;
}

const TOPIC_ID_REGEX = /^[a-z0-9][a-z0-9-]*$/;

export const TopicManagerView = ({
  topics: initialTopics,
  activeTopic: initialActiveTopic,
  onSave,
}: TopicManagerViewProps) => {
  const [topics, setTopics] = useState<Topic[]>(
    initialTopics.length > 0 ? initialTopics : [DEFAULT_TOPIC]
  );
  const [activeTopic, setActiveTopic] = useState<string>(initialActiveTopic);

  // 追加フォーム
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newId, setNewId] = useState("");
  const [idError, setIdError] = useState("");

  // タイトル編集
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const isSaving = useRef(false);

  // ─────────────────────────────────────────────
  // ハンドラ
  // ─────────────────────────────────────────────

  const handleSwitch = async (topicId: string) => {
    if (isSaving.current) return;
    isSaving.current = true;
    try {
      await onSave(topics, topicId);
    } finally {
      isSaving.current = false;
    }
  };

  const handleOpenMenu = (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    const menu = new Menu();

    if (topic.id !== activeTopic) {
      menu.addItem((item) =>
        item
          .setTitle("このトピックに切り替え")
          .setIcon("check")
          .onClick(() => handleSwitch(topic.id))
      );
    }

    // デフォルトトピックはタイトル変更不可
    if (topic.id !== "") {
      menu.addItem((item) =>
        item
          .setTitle("タイトルを変更")
          .setIcon("pencil")
          .onClick(() => {
            setEditingId(topic.id);
            setEditingTitle(topic.title);
            setTimeout(() => editInputRef.current?.focus(), 50);
          })
      );
    }

    menu.showAtMouseEvent(e as unknown as MouseEvent);
  };

  const commitTitleEdit = () => {
    if (editingId === null) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setTopics((prev) =>
      prev.map((t) => (t.id === editingId ? { ...t, title: trimmed } : t))
    );
    setEditingId(null);
  };

  const handleAddSubmit = () => {
    const trimmedId = newId.trim();
    const trimmedTitle = newTitle.trim();

    // バリデーション
    if (!trimmedId) {
      setIdError("IDを入力してください");
      return;
    }
    if (!TOPIC_ID_REGEX.test(trimmedId)) {
      setIdError("英小文字・数字・ハイフンのみ使用可（先頭は英数字）");
      return;
    }
    if (topics.some((t) => t.id === trimmedId)) {
      setIdError("このIDはすでに使用されています");
      return;
    }

    const newTopic: Topic = {
      id: trimmedId,
      title: trimmedTitle || trimmedId,
    };
    const updated = [...topics, newTopic];
    setTopics(updated);
    setNewTitle("");
    setNewId("");
    setIdError("");
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    setNewTitle("");
    setNewId("");
    setIdError("");
    setShowAddForm(false);
  };

  return (
    <VStack
      align="stretch"
      spacing={0}
      paddingBottom="var(--size-4-4)"
    >
      {/* トピック一覧 */}
      <VStack align="stretch" spacing={3}>
        {topics.map((topic, idx) => {
          const isActive = topic.id === activeTopic;
          const isEditing = editingId === topic.id;

          return (
            <React.Fragment key={topic.id}>
              {/* {idx > 0 && <Divider borderColor="var(--background-modifier-border)" />} */}
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
                _hover={{ backgroundColor: "var(--background-modifier-hover)" }}
                onDoubleClick={() => handleSwitch(topic.id)}
                transition="background 0.15s"
              >
                {/* アクティブインジケータ */}
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

                {/* タイトル / ID */}
                <Box flex={1} minWidth={0}>
                  {isEditing ? (
                    <Input
                      ref={editInputRef}
                      size="sm"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={commitTitleEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitTitleEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      borderColor="var(--color-accent)"
                    />
                  ) : (
                    <>
                      <HStack spacing="var(--size-4-2)" align="center">
                        <Text
                          fontWeight={isActive ? "600" : "400"}
                          color={
                            isActive
                              ? "var(--text-normal)"
                              : "var(--text-normal)"
                          }
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

                {/* ••• メニューボタン */}
                <Flex
                  aria-label="メニュー"
                  height="24px"
                  width="24px"
                  justifyContent="center"
                  alignItems="center"
                  flexShrink={0}
                  color="var(--text-muted)"
                  _hover={{ color: "var(--text-normal)" }}
                  onClick={(e) => handleOpenMenu(topic, e)}
                >
                  <ObsidianIcon name="more-horizontal" boxSize="1.1em" />
                </Flex>

              </Flex>
            </React.Fragment>
          );
        })}
      </VStack>

      {/* 追加フォーム */}
      {showAddForm ? (
        <Box
          marginTop="var(--size-4-3)"
          padding="var(--size-4-3)"
          borderRadius="var(--radius-m)"
          border="1px solid var(--background-modifier-border)"
          backgroundColor="var(--background-secondary)"
        >
          <VStack align="stretch" spacing="var(--size-4-2)">
            <FormControl>
              <FormLabel fontSize="var(--font-ui-smaller)" color="var(--text-muted)" marginBottom="2px">
                タイトル
              </FormLabel>
              <Input
                size="sm"
                placeholder="例: 小説"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </FormControl>

            <FormControl isInvalid={!!idError}>
              <FormLabel fontSize="var(--font-ui-smaller)" color="var(--text-muted)" marginBottom="2px">
                ID <Text as="span" color="var(--text-faint)">(作成後変更不可)</Text>
              </FormLabel>
              <Input
                size="sm"
                placeholder="例: novel"
                value={newId}
                onChange={(e) => {
                  setNewId(e.target.value);
                  setIdError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubmit();
                  if (e.key === "Escape") handleCancelAdd();
                }}
                fontFamily="var(--font-monospace)"
              />
              {idError ? (
                <FormErrorMessage fontSize="var(--font-ui-smaller)">{idError}</FormErrorMessage>
              ) : (
                <FormHelperText fontSize="var(--font-ui-smaller)" color="var(--text-faint)">
                  英小文字・数字・ハイフンのみ。ファイル名のプレフィックスになります。
                </FormHelperText>
              )}
            </FormControl>

            <HStack justify="flex-end" spacing="var(--size-4-2)">
              <Button size="sm" variant="ghost" onClick={handleCancelAdd}>
                キャンセル
              </Button>
              <Button
                size="sm"
                backgroundColor="var(--color-accent)"
                color="var(--text-on-accent)"
                _hover={{ backgroundColor: "var(--color-accent-2)" }}
                onClick={handleAddSubmit}
              >
                追加
              </Button>
            </HStack>
          </VStack>
        </Box>
      ) : (
        <Button
          marginTop="var(--size-4-3)"
          variant="ghost"
          leftIcon={<ObsidianIcon name="plus" boxSize="1em" />}
          size="sm"
          color="var(--text-muted)"
          _hover={{ color: "var(--text-normal)", backgroundColor: "var(--background-modifier-hover)" }}
          justifyContent="flex-start"
          onClick={() => setShowAddForm(true)}
        >
          新しいトピックを追加
        </Button>
      )}
    </VStack>
  );
};
