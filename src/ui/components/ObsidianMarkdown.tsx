import { MarkdownRenderer } from "obsidian";
import { useEffect, useRef } from "react";
import { Box } from "src/ui/components/primitives";
import { useAppContext, useObsidianApp } from "src/ui/context/AppContext";

interface Props {
  content: string;
  sourcePath?: string;
}

export const ObsidianMarkdown: React.FC<Props> = ({ content, sourcePath }) => {
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
  }, [content, sourcePath, app, view]);

  return <Box ref={rootRef} className="markdown-rendered block" />;
};
