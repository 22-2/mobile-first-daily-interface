import Markdown, { ReactRenderer } from "marked-react";
import { App, TFile } from "obsidian";
import { useMemo } from "react";
import { useObsidianApp } from "../context/AppContext";

type CustomReactRenderer = Partial<ReactRenderer>;

export interface MarkedMarkdownProps {
  content: string;
  inline?: boolean;
}

const createRenderer = (app: App): CustomReactRenderer => ({
  text(content) {
    const textContent = String(content);

    console.log("Rendering text:", textContent); // デバッグ用ログ

    // ![[画像名.png]] のパターンにマッチさせる
    const regex = /!\[\[(.+?)\.(png|jpg|jpeg|gif|svg|webp)\]\]/g;

    // マッチするものがない場合はそのままテキストを返す
    if (!regex.test(textContent)) {
      return content;
    }

    // 文字列を分割して、埋め込み部分を React 要素に置き換える
    const parts = textContent.split(regex);
    const elements = [];

    // splitの結果、[テキスト, ファイル名, 拡張子, テキスト...] という配列になる
    for (let i = 0; i < parts.length; i += 3) {
      elements.push(parts[i]); // 前方のテキスト
      if (parts[i + 1]) {
        const fileName = `${parts[i + 1]}.${parts[i + 2]}`;
        // ここで実際の画像パス（publicフォルダやAPIエンドポイント）に合わせる
        const file = app.metadataCache.getFirstLinkpathDest(fileName, "") as TFile;

        if (!file || !(file instanceof TFile)) {
          return content;
        }

        // const fullPath = (app.vault.adapter as unknown as { getFullPath: (path: string) => string }).getFullPath(file.path);
        const appPath = app.vault.adapter.getResourcePath(file.path);

        elements.push(
          <img
            className="rendererd-img"
            key={i}
            src={appPath}
            alt={fileName}
            style={{ maxWidth: "100%" }}
          />,
        );
      }
    }

    return elements;
  },
});

export const MarkedMarkdown: React.FC<MarkedMarkdownProps> = ({
  content,
  inline,
}) => {
  const app = useObsidianApp();
  const renderer = useMemo(() => createRenderer(app), [app]);

  return (
    <div
      className={`markdown-rendered ${inline ? "is-inline" : ""}`}
      style={{
        display: inline ? "inline-block" : "block",
      }}
    >
      <Markdown gfm breaks renderer={renderer}>
        {content}
      </Markdown>
    </div>
  );
};
