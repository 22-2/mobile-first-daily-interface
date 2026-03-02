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
  const wrapperRef = useRef<MagicalEditor | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      wrapperRef.current?.focus();
    },
  }));

  const delayedFocus = () => {
    if (containerRef.current?.ownerDocument.querySelector(".mfdi-modal-editor")) {
      return;
    }
    setTimeout(() => {
      wrapperRef.current?.focus();
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
        });
        if (active && containerRef.current) {
          wrapperRef.current = editor;
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
      wrapperRef.current?.destroy();
      wrapperRef.current = null;
    };
  }, []); 

  // Handle external value changes (e.g. clearing after submit or starting edit)
  useEffect(() => {
    if (wrapperRef.current && wrapperRef.current.getContent() !== value) {
      wrapperRef.current.setContent(value);
    }
  }, [value]);

  return (
    <Box
      ref={containerRef}
      {...props}
    />
  );
});
