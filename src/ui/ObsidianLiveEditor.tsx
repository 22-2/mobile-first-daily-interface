import { Box, BoxProps } from "@chakra-ui/react";
import { App, WorkspaceLeaf } from "obsidian";
import { MagicalEditorWrapper } from "obsidian-magical-editor";
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
  const wrapperRef = useRef<MagicalEditorWrapper | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      wrapperRef.current?.focus();
    },
  }));

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (containerRef.current) {
        containerRef.current.empty();
        const wrapper = await MagicalEditorWrapper.create(app, leaf, {
          onChange: (text) => {
             if (active) onChange(text);
          },
          initialContent: value,
        });
        if (active && containerRef.current) {
          wrapperRef.current = wrapper;
          containerRef.current.appendChild(wrapper.view.containerEl);
          wrapper.focus();
        } else {
          wrapper.destroy();
        }
      }
    };

    init();

    return () => {
      active = false;
      wrapperRef.current?.destroy();
      wrapperRef.current = null;
    };
  }, [leaf, app]); 

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
