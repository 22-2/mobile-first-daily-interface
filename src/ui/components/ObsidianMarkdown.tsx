import { Box } from "@chakra-ui/react";
import { Component, MarkdownRenderer } from "obsidian";
import { useEffect, useRef } from "react";
import { useObsidianApp } from "src/ui/context/AppContext";

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
  const app = useObsidianApp();
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
