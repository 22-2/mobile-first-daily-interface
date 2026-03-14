import { useCallback, useRef, useState } from "react";
import { DEFAULT_TOPIC, Topic } from "src/topic";

const TOPIC_ID_REGEX = /^[a-z0-9][a-z0-9-]*$/;

export const useTopicManager = (
  initialTopics: Topic[],
  initialActiveTopic: string,
  onSave: (topics: Topic[], activeTopic: string) => Promise<void>,
) => {
  const [topics, setTopics] = useState<Topic[]>(
    initialTopics.length > 0 ? initialTopics : [DEFAULT_TOPIC],
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

  const handleSwitch = useCallback(
    async (topicId: string) => {
      if (isSaving.current) return;
      isSaving.current = true;
      try {
        const updatedTopics = topics.map((t) =>
          t.id === topicId ? { ...t, archived: false } : t,
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
      prev.map((t) => (t.id === topicId ? { ...t, archived: !t.archived } : t)),
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
      prev.map((t) => (t.id === editingId ? { ...t, title: trimmed } : t)),
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
    if (topics.some((t) => t.id === trimmedId)) {
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
    setIdError,
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
