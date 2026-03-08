import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ObsidianLiveEditorRef } from "../../ObsidianLiveEditor";
import { Granularity, MomentLike, Post } from "../../types";
import { granularityConfig } from "../../granularity-config";

import { useAppContext } from "../../context/AppContext";

interface UseMFDIEditorOptions {
  posts: Post[];
  date: MomentLike;
  granularity: Granularity;
}

/**
 * 投稿・編集の入力状態を管理するHook。
 * 下書きの保存、編集モードの切り替え、入力フォーカスの制御を担当します。
 */
export function useMFDIEditor({
  posts,
  date,
  granularity,
}: UseMFDIEditorOptions) {
  const { storage } = useAppContext();
  const [input, setInput] = useState(() => storage.get<string>("input", ""));
  const [asTask, setAsTask] = useState<boolean>(
    () => storage.get<boolean>("asTask", false)
  );
  const [editingPostOffset, setEditingPostOffset] = useState<number | null>(
    () => storage.get<number | null>("editingPostOffset", null)
  );

  const inputRef = useRef<ObsidianLiveEditorRef>(null);

  const editingPost = useMemo(() => {
    if (editingPostOffset === null) return null;
    return posts.find((p) => p.startOffset === editingPostOffset) ?? null;
  }, [posts, editingPostOffset]);

  const canSubmit = useMemo(() => {
    const isPast = date.isBefore(
      window.moment(),
      granularityConfig[granularity].unit
    );
    if (isPast) return false;

    if (!editingPost) {
      return input.trim().length > 0;
    }
    return input !== editingPost.message;
  }, [input, editingPost, date, granularity]);

  const startEdit = useCallback(
    (post: Post) => {
      setAsTask(false);
      setEditingPostOffset(post.startOffset);
      storage.set("editingPostDate", date.toISOString());
      storage.set("editingPostGranularity", granularity);
      setInput(post.message);
      setTimeout(() => {
        inputRef.current?.setContent(post.message);
        inputRef.current?.focus();
      });
    },
    [date, granularity, storage]
  );

  const cancelEdit = useCallback(() => {
    setEditingPostOffset(null);
    storage.remove("editingPostDate");
    storage.remove("editingPostGranularity");
    setInput("");
    inputRef.current?.setContent("");
  }, [storage]);


  // ────────────────────────────────────────────────────────────
  // Storage Persistence
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    storage.set("asTask", asTask);
  }, [asTask, storage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      storage.set("input", input);
    }, 500);
    return () => clearTimeout(timer);
  }, [input, storage]);

  useEffect(() => {
    storage.set("editingPostOffset", editingPostOffset);
    if (editingPostOffset !== null) {
      storage.set("editingPostDate", date.toISOString());
      storage.set("editingPostGranularity", granularity);
    }
  }, [editingPostOffset, date, granularity, storage]);

  // Handle post deletion or list change
  useEffect(() => {
    if (editingPostOffset !== null && posts.length > 0 && !editingPost) {
      setEditingPostOffset(null);
    }
  }, [posts, editingPostOffset, editingPost]);

  return {
    input,
    setInput,
    asTask,
    setAsTask,
    editingPost,
    editingPostOffset,
    setEditingPostOffset,
    inputRef,
    canSubmit,
    startEdit,
    cancelEdit,
  };
}
