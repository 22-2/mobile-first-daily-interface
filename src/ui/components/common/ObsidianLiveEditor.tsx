import { Box, BoxProps } from "@chakra-ui/react";
import { App, WorkspaceLeaf } from "obsidian";
import { FakeEditor } from "obsidian-magical-editor";
import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface ObsidianLiveEditorProps extends Omit<
  BoxProps,
  "onChange" | "onSubmit"
> {
  leaf: WorkspaceLeaf;
  app: App;
  initialValue: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  isReadOnly?: boolean;
  readonlyPlaceholder?: string;
}

export interface ObsidianLiveEditorRef {
  focus: () => void;
  getValue: () => string;
  getContentSnapshot: () => string;
  subscribeContent: (listener: (text: string) => void) => () => void;
  setContent: (text: string) => void;
}

export const ObsidianLiveEditor = forwardRef<
  ObsidianLiveEditorRef,
  ObsidianLiveEditorProps
>(
  (
    {
      leaf,
      app,
      initialValue,
      onChange,
      onSubmit,
      placeholder,
      isReadOnly,
      readonlyPlaceholder,
      ...props
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const fakeEditor = useRef<FakeEditor | null>(null);
    const onChangeRef = useRef(onChange);
    const isComposingRef = useRef(false);
    const pendingContentRef = useRef<string | null>(null);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useImperativeHandle(ref, () => ({
      focus: () => fakeEditor.current?.focus(),
      getValue: () => fakeEditor.current?.getContent() ?? "",
      getContentSnapshot: () =>
        fakeEditor.current?.getContentSnapshot() ?? "",
      subscribeContent: (listener) =>
        fakeEditor.current?.subscribeContent(listener) ?? (() => {}),
      setContent: (text: string) => {
        fakeEditor.current?.setContent(text);
      },
    }));

    const onSubmitRef = useRef(onSubmit);
    useEffect(() => {
      onSubmitRef.current = onSubmit;
    }, [onSubmit]);

    useEffect(() => {
      let active = true;

      const init = async () => {
        if (!containerRef.current) return;
        containerRef.current.empty();

        // @ts-expect-error
        const editor = new FakeEditor(app, {
          onChange: (text) => {
            if (!active) return;

            if (isComposingRef.current) {
              pendingContentRef.current = text;
              return;
            }

            onChangeRef.current(text);
          },
          onEnter: (_editor: unknown, mod: boolean, shift: boolean) => {
            if (mod && !shift) {
              onSubmitRef.current?.();
              return true;
            }
            return false;
          },
          parentScope: leaf.view.scope,
          initialContent: initialValue ?? "",
          placeholder: placeholder,
          isReadOnly: isReadOnly,
          readonlyPlaceholder: readonlyPlaceholder,
        });

        if (active && containerRef.current) {
          fakeEditor.current = editor;
          fakeEditor.current!.loadToDom(containerRef.current);
          await editor.ready;

          if (!active) {
            editor.destroy();
            return;
          }

          const editorView = editor.view;
          if (!editorView) {
            return;
          }

          const editorContainer = editorView.containerEl;
          const handleCompositionStart = () => {
            isComposingRef.current = true;
          };
          const handleCompositionEnd = () => {
            if (!active) return;

            isComposingRef.current = false;
            const nextText =
              pendingContentRef.current ?? fakeEditor.current?.getContent() ?? "";
            pendingContentRef.current = null;
            onChangeRef.current(nextText);
          };

          editorContainer.addEventListener(
            "compositionstart",
            handleCompositionStart,
          );
          editorContainer.addEventListener("compositionend", handleCompositionEnd);

          const originalDestroy = editor.destroy.bind(editor);
          editor.destroy = () => {
            editorContainer.removeEventListener(
              "compositionstart",
              handleCompositionStart,
            );
            editorContainer.removeEventListener(
              "compositionend",
              handleCompositionEnd,
            );
            originalDestroy();
          };
        } else {
          editor.destroy();
        }
      };

      init();
      return () => {
        active = false;
        isComposingRef.current = false;
        pendingContentRef.current = null;
        const editor = fakeEditor.current;
        fakeEditor.current = null;
        editor?.destroy();
      };
    }, []); // Empty dependency array! Do not re-run on props change.

    // Synchronize read-only state and placeholder
    useEffect(() => {
      if (fakeEditor.current) {
        fakeEditor.current.setReadOnly(!!isReadOnly);
      }
    }, [isReadOnly]);

    useEffect(() => {
      if (fakeEditor.current) {
        fakeEditor.current.setPlaceholder(
          placeholder || "",
          readonlyPlaceholder,
        );
      }
    }, [placeholder, readonlyPlaceholder]);

    return (
      <Box position="relative" {...props}>
        <Box ref={containerRef} height="100%" width="100%" />
      </Box>
    );
  },
);
