import { Box, BoxProps } from "@chakra-ui/react";
import { App, EventRef, WorkspaceLeaf } from "obsidian";
import { MagicalEditor } from "obsidian-magical-editor";
import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface ObsidianLiveEditorProps extends Omit<BoxProps, "onChange"> {
  leaf: WorkspaceLeaf;
  app: App;
  value: string;
  onChange: (text: string) => void;
}

export interface ObsidianLiveEditorRef {
  focus: () => void;
}

export const ObsidianLiveEditor = forwardRef<ObsidianLiveEditorRef, ObsidianLiveEditorProps>(({
  leaf,
  app,
  value,
  onChange,
  ...props
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const magicalEditorRef = useRef<MagicalEditor | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      magicalEditorRef.current?.focus();
    },
  }));

  const delayedFocus = (activeLeaf?: WorkspaceLeaf | null) => {
    const targetLeaf = activeLeaf;
    if (targetLeaf !== leaf) {
      return;
    }
    if (containerRef.current?.ownerDocument.querySelector(".mfdi-modal-editor")) {
      return;
    }
    setTimeout(() => {
      magicalEditorRef.current?.focus();
    });
  };

  useEffect(() => {
    let active = true;
    let eventRef: EventRef;
    const init = async () => {
      if (containerRef.current) {
        containerRef.current.empty();
        const editor = await MagicalEditor.create(app, leaf, {
          onChange: (text) => {
             if (active) onChange(text);
          },
          initialContent: value,
          placeholder: "なんでもかいていいのよ😊",
        });
        if (active && containerRef.current) {
          magicalEditorRef.current = editor;
          containerRef.current.appendChild(editor.view.containerEl);
          delayedFocus();
          eventRef = app.workspace.on("active-leaf-change", delayedFocus);
        } else {
          editor.destroy();
        }
      }
    };

    init();

    return () => {
      active = false;
      app.workspace.offref(eventRef);
      magicalEditorRef.current?.destroy();
      magicalEditorRef.current = null;
    };
  }, []); 

  // Handle external value changes (e.g. clearing after submit or starting edit)
  useEffect(() => {
    if (magicalEditorRef.current && magicalEditorRef.current.getContent() !== value) {
      magicalEditorRef.current.setContent(value);
    }
  }, [value]);

  return (
    <Box
      ref={containerRef}
      {...props}
    />
  );
});
