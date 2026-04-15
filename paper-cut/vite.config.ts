import react from "@vitejs/plugin-react";
import { builtinModules } from "module";
import path from "path";
import { defineConfig, loadEnv, type UserConfig } from "vite";
// ルートの vite.plugins.ts を共有利用する
import { obsidianCopyPlugin } from "../vite.plugins";

export default defineConfig(async ({ mode }) => {
  const { resolve } = path;
  const env = loadEnv(mode, process.cwd(), "");

  const isWatch = process.argv.includes("--watch");
  const isDev = mode === "development" || isWatch;
  const isProd = !isDev;
  const onMyPc = env.ON_MY_PC === "true";

  return {
    plugins: [
      react(),
      onMyPc && obsidianCopyPlugin({
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
        // MFDI の共有ソースを src/* で参照できるようにする（cwd は paper-cut/）
        src: path.resolve(__dirname, "../src"),
        // paper-cut 内部モジュールを paper-cut/src/* で参照できるようにする
        "paper-cut/src": path.resolve(__dirname, "./src"),
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
      watch: isWatch ? { include: ["src/**", "../src/**"] } : undefined,
      cssCodeSplit: false,
      emptyOutDir: false,
      // outDir を空にすることで paper-cut/ 直下に main.js / styles.css を出力する
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
          ...builtinModules,
        ],
      },
    },
  } as UserConfig;
});
