import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import builtins from "builtin-modules";
import path from "path";
import { defineConfig, type UserConfig } from "vite";
import { obsidianCopyPlugin } from "./vite.plugins";
// import tailwindcss from "@tailwindcss/vite";
import { analyzer } from "vite-bundle-analyzer";

export default defineConfig(async ({ mode }) => {
  const { resolve } = path;
  // ビルド解析 (analyze) の有効化は CLI フラグではなく環境変数で制御する。
  // 理由: Vite の CLI は未定義のオプションを受け取ると起動時にエラーを投げるため、
  // `pnpm build -- --analyze` のようにスクリプト経由で渡しても Vite が拒否してしまう。
  // そのため、CIやローカルで `ANALYZE=true pnpm build`（または PowerShell では
  // `$env:ANALYZE = 'true'; pnpm build'`）のように環境変数で切り替える方式に変更する。
  const isAnalyze = process.env.ANALYZE === "true" || process.env.VITE_ANALYZE === "true";
  // watchモードはCLIフラグ(--watch)か環境変数(VITE_WATCH=true)で有効化する
  // 理由: 開発中にファイル変更を監視して自動で再ビルドしたいケースがあるため。
  // `vite build --watch` の代替として使えるようにし、既存のdevサーバーと干渉しない挙動にする。
  const isWatch = process.argv.includes("--watch") || process.env.VITE_WATCH === "true";
  const isDev = mode === "development" || isWatch;
  const isProd = !isDev;

  return {
    plugins: [
      isAnalyze && analyzer(),
      react(),
      // tailwindcss(),
      reactCompilerPreset(),
      obsidianCopyPlugin({
        pluginsDir: [
          "C:/Users/17890/AppData/Roaming/obsidian/Obsidian Sandbox/.obsidian/plugins",
          "E:/AppData/obsidian/vaults/suizen/.obsidian/plugins",
          "G:/マイドライブ/documents/obsidian/vaults/sagyosen/.obsidian/plugins",
        ],
        force: true,
      }),
    ],
    resolve: {
      alias: {
        src: path.resolve(__dirname, "./src"),
        react: "preact/compat",
        "react-dom": "preact/compat",
        "react-dom/client": "preact/compat/client",
        "react-dom/test-utils": "preact/test-utils",
        "react/jsx-runtime": "preact/jsx-runtime",
      },
    },
    build: {
      lib: {
        entry: resolve(__dirname, "src/main.ts"),
        name: "main",
        fileName: () => "main.js",
        formats: ["cjs"],
      },
      minify: isProd,
      sourcemap: isProd ? false : "inline",
      // watchモード時はRollupのwatch設定を渡す
      // ここではsrc配下のファイルを監視対象にしておく（必要に応じて調整してください）
      watch: isWatch ? { include: "src/**" } : undefined,
      cssCodeSplit: false,
      emptyOutDir: false,
      outDir: "",
      rollupOptions: {
        input: {
          main: resolve(__dirname, "src/main.ts"),
        },
        output: {
          entryFileNames: "main.js",
          assetFileNames: "styles.css",
        },
        external: [
          "obsidian",
          "electron",
          "@codemirror/autocomplete",
          "@codemirror/collab",
          "@codemirror/commands",
          "@codemirror/language",
          "@codemirror/lint",
          "@codemirror/search",
          "@codemirror/state",
          "@codemirror/view",
          "@lezer/common",
          "@lezer/highlight",
          "@lezer/lr",
          ...builtins,
        ],
      },
    },
  } as UserConfig;
});
