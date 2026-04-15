// @tailwindcss/vite が Tailwind 処理を担うため、ここには PostCSS 追加プラグインのみ定義する。
// safe-important-v4: ユーティリティクラスに !important を付与して Obsidian のスタイルに勝つ。
export default {
  plugins: [
    {
      postcssPlugin: "safe-important-v4",
      Once(root) {
        root.walkRules((rule) => {
          if (
            rule.parent &&
            rule.parent.type === "atrule" &&
            (rule.parent.name === "property" || rule.parent.name === "theme")
          ) {
            return;
          }
          if (rule.selector.startsWith(".")) {
            rule.walkDecls((decl) => {
              decl.important = true;
            });
          }
        });
      },
    },
  ],
};
