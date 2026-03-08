import { Box } from "@chakra-ui/react";
import { Component, MarkdownRenderer } from "obsidian";
import * as React from "react";
import { useEffect, useRef } from "react";
import { useAppContext } from "../context/AppContext";

interface Props {
  content: string;
  sourcePath?: string;
  inline?: boolean;
}

export const ObsidianMarkdown: React.FC<Props> = ({
  content,
  sourcePath,
  inline,
}) => {
  const { app } = useAppContext();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const component = new Component();
    component.load();

    rootRef.current.innerHTML = "";

    MarkdownRenderer.render(
      app,
      content,
      rootRef.current,
      sourcePath ?? "",
      component,
    ).catch((e) => console.error("Failed to render markdown", e));

    return () => {
      component.unload();
    };
  }, [content, sourcePath, app, inline]);

  return (
    <Box
      ref={rootRef}
      className={`markdown-rendered ${inline ? "is-inline" : ""}`}
      display={inline ? "inline-block" : "block"}
      sx={
        inline
          ? {
              "& > p": {
                display: "inline",
              },
            }
          : {}
      }
    />
  );
};
