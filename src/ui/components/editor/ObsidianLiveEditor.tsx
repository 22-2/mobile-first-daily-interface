import { Box, BoxProps } from "@chakra-ui/react";
import { App, WorkspaceLeaf } from "obsidian";
import { type FakeEditor } from "@22-2/obsidian-magical-editor";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useFakeEditor } from "./hooks";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ObsidianLiveEditorRef {
  focus: FakeEditor["focus"];
  getValue: FakeEditor["getContent"];
  getContentSnapshot: FakeEditor["getContentSnapshot"];
  subscribeContent: FakeEditor["subscribeContent"];
  setContent: FakeEditor["setContent"];
}

export interface ObsidianLiveEditorProps extends Omit<
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

// ─── Component ────────────────────────────────────────────────────────────────

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
      ...boxProps
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const editorRef = useFakeEditor(containerRef, {
      app,
      leaf,
      initialValue,
      placeholder,
      isReadOnly,
      readonlyPlaceholder,
      onChange,
      onSubmit,
    });

    // Expose imperative API to parent
    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      getValue: () => editorRef.current?.getContent() ?? "",
      getContentSnapshot: () => editorRef.current?.getContentSnapshot() ?? "",
      subscribeContent: (listener) =>
        editorRef.current?.subscribeContent(listener) ?? (() => {}),
      setContent: (text) => editorRef.current?.setContent(text),
    }));

    // Sync read-only state after mount
    useEffect(() => {
      editorRef.current?.setReadOnly(!!isReadOnly);
    }, [isReadOnly]);

    // Sync placeholder after mount
    useEffect(() => {
      editorRef.current?.setPlaceholder(placeholder ?? "", readonlyPlaceholder);
    }, [placeholder, readonlyPlaceholder]);

    return (
      <Box position="relative" {...boxProps}>
        <Box ref={containerRef} height="100%" width="100%" />
      </Box>
    );
  },
);

ObsidianLiveEditor.displayName = "ObsidianLiveEditor";
