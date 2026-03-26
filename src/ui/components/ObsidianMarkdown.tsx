import { Box } from "@chakra-ui/react";
import { MarkdownRenderer } from "obsidian";
import { useEffect, useRef } from "react";
import { useAppContext, useObsidianApp } from "src/ui/context/AppContext";

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
  const { view } = useAppContext();

  useEffect(() => {
    if (!rootRef.current) return;

    rootRef.current.empty();

    MarkdownRenderer.render(
      app,
      content,
      rootRef.current,
      sourcePath ?? "",
      view,
    ).catch((e) => console.error("Failed to render markdown", e));
  }, [content, sourcePath, app, inline, view]);

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
