import { type UserConfig, defineConfig } from "vite";
import path from "path";
import builtins from "builtin-modules";
import { obsidianCopyPlugin } from "./vite.plugins";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { analyzer } from "vite-bundle-analyzer";

export default defineConfig(async ({ mode }) => {
  const { resolve } = path;
  const isProd = mode === "production";
  const isAnalyze = process.argv.includes("--analyze");

  return {
    plugins: [
      isAnalyze && analyzer(),
      react(),
      tailwindcss(),
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
