// postcss.config.mjs
import tailwindcss from "@tailwindcss/postcss";

export default {
  plugins: [
    tailwindcss(),
    {
      postcssPlugin: "safe-important-v4",
      Once(root) {
        root.walkRules((rule) => {
          // @property や @theme の中はスキップ
          if (
            rule.parent &&
            rule.parent.type === "atrule" &&
            (rule.parent.name === "property" || rule.parent.name === "theme")
          ) {
            return;
          }

          // ユーティリティクラス（通常は . で始まるセレクタ）にのみ適用するっす
          // これにより、要素セレクタ（html, body, divなど）への important 付与を防ぐっす
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
