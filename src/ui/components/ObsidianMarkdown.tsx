import { MarkdownRenderer } from "obsidian";
import { useEffect, useRef } from "react";
import { Box } from "src/ui/components/primitives";
import { useObsidianApp } from "src/ui/context/AppContext";
import { useObsidianComponent } from "src/ui/context/ComponentContext";

interface Props {
  content: string;
  sourcePath?: string;
}

export const ObsidianMarkdown: React.FC<Props> = ({ content, sourcePath }) => {
  const app = useObsidianApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const component = useObsidianComponent();

  useEffect(() => {
    if (!rootRef.current) return;

    rootRef.current.empty();

    MarkdownRenderer.render(
      app,
      content,
      rootRef.current,
      sourcePath ?? "",
      component,
    ).catch((e) => console.error("Failed to render markdown", e));
  }, [content, sourcePath, app, component]);

  return <Box ref={rootRef} className="markdown-rendered block" />;
};
