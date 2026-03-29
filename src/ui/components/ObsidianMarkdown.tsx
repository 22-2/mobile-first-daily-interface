import { MarkdownRenderer } from "obsidian";
import { useEffect, useRef } from "react";
import { Box } from "src/ui/components/primitives";
import { useAppContext } from "src/ui/context/AppContext";
import { useObsidianComponent } from "src/ui/context/ComponentContext";

interface Props {
  content: string;
  sourcePath?: string;
}

export const ObsidianMarkdown: React.FC<Props> = ({ content, sourcePath }) => {
  const { shell } = useAppContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const component = useObsidianComponent();

  useEffect(() => {
    if (!rootRef.current) return;

    rootRef.current.empty();

    MarkdownRenderer.render(
      shell.getRawApp(),
      content,
      rootRef.current,
      sourcePath ?? "",
      component,
    ).catch((e) => console.error("Failed to render markdown", e));
  }, [content, sourcePath, shell, component]);

  return (
    <Box
      ref={rootRef}
      className="markdown-rendered block"
      onClick={(e) => {
        const el = e.target as HTMLElement;
        // 応急処置
        // なぜかObsidianのMarkdownRendererはaタグにonClickをつけないとリンクが機能しない

        if (el.tagName !== "A") {
          return;
        }
        if (!el.classList.contains("internal-link")) {
          return;
        }
        e.preventDefault();
        const href = el.getAttribute("data-href");
        shell
          .getRawApp()
          .workspace.getLeaf()
          .openLinkText(href ?? "", sourcePath ?? "");
      }}
    />
  );
};
