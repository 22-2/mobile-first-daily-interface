import { type UserConfig, defineConfig } from "vite";
import path from "path";
import builtins from "builtin-modules";
import { obsidianCopyPlugin } from "./vite.plugins";
import react, { reactCompilerPreset,  } from "@vitejs/plugin-react"

export default defineConfig(async ({ mode }) => {
	const { resolve } = path;
	const prod = mode === "production";

	return {
		plugins: [
      react(),
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
				"src": path.resolve(__dirname, "./src"),
			},
		},
		build: {
			lib: {
				entry: resolve(__dirname, "src/main.ts"),
				name: "main",
				fileName: () => "main.js",
				formats: ["cjs"],
			},
			minify: prod,
			sourcemap: prod ? false : "inline",
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
