import { Box, BoxProps } from "@chakra-ui/react";
import { App, MarkdownView, WorkspaceLeaf } from "obsidian";
import { MagicalEditor } from "obsidian-magical-editor";
import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface ObsidianLiveEditorProps extends Omit<BoxProps, "onChange" | "onSubmit"> {
  leaf: WorkspaceLeaf;
  app: App;
  value: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
}

export interface ObsidianLiveEditorRef {
  focus: () => void;
  getValue: () => string;
}

export const ObsidianLiveEditor = forwardRef<ObsidianLiveEditorRef, ObsidianLiveEditorProps>(
  ({ leaf, app, value, onChange, onSubmit, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const magicalEditorRef = useRef<MagicalEditor | null>(null);
    const lastNotifiedValue = useRef<string>(value);

    useImperativeHandle(ref, () => ({
      focus: () => magicalEditorRef.current?.focus(),
      getValue: () => magicalEditorRef.current?.getContent() ?? "",
    }));

    useEffect(() => {
      let active = true;
      const init = async () => {
        if (!containerRef.current) return;
        containerRef.current.empty();
        
        const editor = await MagicalEditor.create(app, leaf, {
          onChange: (text) => {
            if (!active) return;
            lastNotifiedValue.current = text;
            onChange(text);
          },
          initialContent: value ?? "",
        });

        if (active && containerRef.current) {
          magicalEditorRef.current = editor;
          magicalEditorRef.current.loadToDom(containerRef.current);

          // Add keyboard listener for submission
          const cm = (editor.view as any).editor?.cm;
          if (cm) {
            cm.dom.addEventListener("keydown", (e: KeyboardEvent) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                e.stopPropagation();
                onSubmit?.();
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
    }, [onSubmit]); // Add onSubmit to deps to ensure listener uses latest handler (though handleSubmit is usually stable)

    useEffect(() => {
      const editor = magicalEditorRef.current;
      if (!editor) return;

      const currentContent = editor.getContent();
      if (value !== currentContent && value !== lastNotifiedValue.current) {
        lastNotifiedValue.current = value;
        editor.setContent(value);
      }
    }, [value]);

    const showPlaceholder = !value;

    return (
      <Box position="relative" {...props}>
          <Box ref={containerRef} height="100%" width="100%" />
          {showPlaceholder && (
            <Box
              position="absolute"
              top="var(--size-2-1)"
              left="var(--size-2-1)"
              pointerEvents="none"
              color="var(--text-muted)"
              opacity={0.6}
              userSelect="none"
              fontSize="var(--font-text-size)"
              zIndex={1}
            >
              なんでもかいていいのよ😊
            </Box>
          )}
          {/* Transparent overlay to catch initial click when empty */}
          {showPlaceholder && (
            <Box
              position="absolute"
              inset="0"
              cursor="text"
              zIndex={2}
              onClick={() => magicalEditorRef.current?.focus()}
            />
          )}
      </Box>
    );
  }
);
