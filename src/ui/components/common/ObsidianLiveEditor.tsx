import { Box, BoxProps } from "@chakra-ui/react";
import { App, MarkdownView, WorkspaceLeaf } from "obsidian";
import { MagicalEditor } from "obsidian-magical-editor";
import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface ObsidianLiveEditorProps extends Omit<
  BoxProps,
  "onChange" | "onSubmit"
> {
  leaf: WorkspaceLeaf;
  app: App;
  value: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  isReadOnly?: boolean;
  readonlyPlaceholder?: string;
}

export interface ObsidianLiveEditorRef {
  focus: () => void;
  getValue: () => string;
  setContent: (text: string) => void;
}

export const ObsidianLiveEditor = forwardRef<
  ObsidianLiveEditorRef,
  ObsidianLiveEditorProps
>(({ leaf, app, value, onChange, onSubmit, placeholder, isReadOnly, readonlyPlaceholder, ...props }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const magicalEditorRef = useRef<MagicalEditor | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => magicalEditorRef.current?.focus(),
    getValue: () => magicalEditorRef.current?.getContent() ?? "",
    setContent: (text: string) => {
      magicalEditorRef.current?.setContent(text);
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

      const editor = await MagicalEditor.create(app, leaf, {
        onChange: (text) => {
          if (!active) return;
          onChange(text);
        },
        initialContent: value ?? "",
        placeholder: placeholder,
        isReadOnly: isReadOnly,
        readonlyPlaceholder: readonlyPlaceholder,
      });

      if (active && containerRef.current) {
        magicalEditorRef.current = editor;
        magicalEditorRef.current.loadToDom(containerRef.current);

        // Add keyboard listener for submission
        const cm = (editor.view as MarkdownView).editor?.cm;
        if (cm) {
          cm.dom.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              e.stopPropagation();
              onSubmitRef.current?.();
            }
          });
        }
      } else {
        editor.destroy();
      }
    };

    init();
    return () => {
      active = false;
      magicalEditorRef.current?.destroy();
    };
  }, []); // Empty dependency array! Do not re-run on props change.

  // Synchronize read-only state and placeholder
  useEffect(() => {
    if (magicalEditorRef.current) {
      magicalEditorRef.current.setReadOnly(!!isReadOnly);
    }
  }, [isReadOnly]);

  useEffect(() => {
    if (magicalEditorRef.current) {
      magicalEditorRef.current.setPlaceholder(placeholder || "", readonlyPlaceholder);
    }
  }, [placeholder, readonlyPlaceholder]);

  return (
    <Box position="relative" {...props}>
      <Box ref={containerRef} height="100%" width="100%" />
    </Box>
  );
});
