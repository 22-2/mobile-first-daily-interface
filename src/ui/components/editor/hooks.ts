import { App, WorkspaceLeaf } from "obsidian";
import { FakeEditor } from "@22-2/obsidian-magical-editor";
import { useCallback, useEffect, useRef } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Keeps a ref always in sync with the latest value of a callback,
 * avoiding stale closures without adding the callback to effect deps.
 */
function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

// ─── IME Composition Hook ─────────────────────────────────────────────────────

interface UseCompositionGuardOptions {
  onFlush: (text: string) => void;
  getFallbackText: () => string;
}

/**
 * Returns handlers and a wrapped onChange that suppresses intermediate
 * IME composition events, flushing the final value on compositionend.
 */
function useCompositionGuard({
  onFlush,
  getFallbackText,
}: UseCompositionGuardOptions) {
  const isComposingRef = useRef(false);
  const pendingTextRef = useRef<string | null>(null);
  const onFlushRef = useLatestRef(onFlush);
  const getFallbackTextRef = useLatestRef(getFallbackText);

  const handleChange = useCallback((text: string) => {
    if (isComposingRef.current) {
      pendingTextRef.current = text;
      return;
    }
    onFlushRef.current(text);
  }, []);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    const text = pendingTextRef.current ?? getFallbackTextRef.current();
    pendingTextRef.current = null;
    onFlushRef.current(text);
  }, []);

  const reset = useCallback(() => {
    isComposingRef.current = false;
    pendingTextRef.current = null;
  }, []);

  return { handleChange, handleCompositionStart, handleCompositionEnd, reset };
}

// ─── Editor Initialization Hook ───────────────────────────────────────────────

interface UseFakeEditorOptions {
  app: App;
  leaf: WorkspaceLeaf;
  initialValue: string;
  placeholder?: string;
  isReadOnly?: boolean;
  readonlyPlaceholder?: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
}

export function useFakeEditor(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseFakeEditorOptions,
) {
  const editorRef = useRef<FakeEditor | null>(null);
  const optionsRef = useLatestRef(options);

  const composition = useCompositionGuard({
    onFlush: (text) => optionsRef.current.onChange(text),
    getFallbackText: () => editorRef.current?.getContent() ?? "",
  });

  useEffect(() => {
    let active = true;

    const init = async () => {
      if (!containerRef.current) return;
      containerRef.current.empty();

      const {
        app,
        leaf,
        initialValue,
        placeholder,
        isReadOnly,
        readonlyPlaceholder,
      } = optionsRef.current;

      const editor = new FakeEditor(app, {
        onChange: (text: string) => {
          if (active) composition.handleChange(text);
        },
        onEnter: (_editor: unknown, mod: boolean, shift: boolean) => {
          if (mod && !shift) {
            optionsRef.current.onSubmit?.();
            return true;
          }
          return false;
        },
        parentScope: leaf.view.scope!,
        initialContent: initialValue ?? "",
        placeholder,
        isReadOnly,
        readonlyPlaceholder,
      });

      if (!active) {
        editor.destroy();
        return;
      }

      editorRef.current = editor;
      editor.loadToDom(containerRef.current!);
      await editor.ready;

      if (!active) {
        editor.destroy();
        return;
      }

      const editorContainer = editor.view?.containerEl;
      if (!editorContainer) return;

      editorContainer.addEventListener(
        "compositionstart",
        composition.handleCompositionStart,
      );
      editorContainer.addEventListener(
        "compositionend",
        composition.handleCompositionEnd,
      );

      // Patch destroy to clean up composition listeners
      const originalDestroy = editor.destroy.bind(editor);
      editor.destroy = () => {
        editorContainer.removeEventListener(
          "compositionstart",
          composition.handleCompositionStart,
        );
        editorContainer.removeEventListener(
          "compositionend",
          composition.handleCompositionEnd,
        );
        originalDestroy();
      };
    };

    init();

    return () => {
      active = false;
      composition.reset();
      const editor = editorRef.current;
      editorRef.current = null;
      editor?.destroy();
    };
  }, []); // Intentionally empty: editor is initialized once per mount.

  return editorRef;
}
