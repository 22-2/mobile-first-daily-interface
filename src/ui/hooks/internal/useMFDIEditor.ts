import { useEffect, useMemo, useRef, useState } from "react";
import { MFDIStorage } from "../../../utils/storage";
import { Granularity, MomentLike, Post } from "../../types";
import { ObsidianLiveEditorRef } from "../../ObsidianLiveEditor";

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
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingPostOffset, setEditingPostOffset] = useState<number | null>(
    () => storage.get<number | null>("editingPostOffset", null)
  );

  const inputRef = useRef<ObsidianLiveEditorRef>(null);

  const canSubmit = useMemo(() => {
    if (!editingPost) {
      return input.trim().length > 0;
    }
    return input !== editingPost.message;
  }, [input, editingPost]);

  const startEdit = (post: Post) => {
    setAsTask(false);
    setEditingPost(post);
    setEditingPostOffset(post.startOffset);
    storage.set("editingPostDate", date.toISOString());
    storage.set("editingPostGranularity", granularity);
    setInput(post.message);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const cancelEdit = () => {
    setEditingPost(null);
    setEditingPostOffset(null);
    storage.remove("editingPostDate");
    storage.remove("editingPostGranularity");
    setInput("");
  };

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

  useEffect(() => {
    if (editingPostOffset !== null) {
      const found = posts.find((p) => p.startOffset === editingPostOffset);
      if (found) {
        setEditingPost(found);
      } else if (posts.length > 0) {
        setEditingPost(null);
        setEditingPostOffset(null);
      }
    } else {
      setEditingPost(null);
    }
  }, [posts, editingPostOffset]);

  return {
    input,
    setInput,
    asTask,
    setAsTask,
    editingPost,
    editingPostOffset,
    setEditingPost,
    setEditingPostOffset,
    inputRef,
    canSubmit,
    startEdit,
    cancelEdit,
  };
}
