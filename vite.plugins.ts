import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { type Plugin, type ResolvedConfig } from "vite";

const DEFAULT_FILES = ["main.js", "manifest.json", "styles.css"];

export function obsidianViteCopyPlugin(options: {
  /** Obsidian のプラグインディレクトリ (例: '/path/to/vault/.obsidian/plugins') */
  pluginsDir: string | string[];
  /** プラグインのフォルダ名 (例: 'my-awesome-plugin') */
  targetDirName: string;
  /** すでにフォルダがある場合に削除して作り直すかどうか (デフォルト: false) */
  force?: boolean;
  /** コピーするファイルリスト */
  files?: string[];
}): Plugin {
  const { pluginsDir, targetDirName, force = false, files = DEFAULT_FILES } = options;
  let config: ResolvedConfig;

  return {
    name: "obsidian-copy",
    apply: "build",

    // Vite の解決済み設定を保持
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    async closeBundle() {
      const outDir = config.build.outDir;
      const targetDirs = Array.isArray(pluginsDir) ? pluginsDir : [pluginsDir];

      for (const baseDir of targetDirs) {
        const targetPath = path.resolve(baseDir, targetDirName);

        try {
          // 1. ターゲットディレクトリの準備
          if (existsSync(targetPath) && force) {
            await fs.rm(targetPath, { recursive: true, force: true });
          }
          await fs.mkdir(targetPath, { recursive: true });

          // 2. 各ファイルのコピー
          for (const fileName of files) {
            const sourceFile = path.resolve(outDir, fileName);
            const destinationFile = path.join(targetPath, fileName);

            if (existsSync(sourceFile)) {
              await fs.copyFile(sourceFile, destinationFile);
              console.log(`\x1b[36m[obsidian-copy] Copied: ${fileName} to ${targetPath}\x1b[0m`);
            } else {
              console.warn(`[obsidian-copy] Warning: Source file not found: ${fileName}`);
            }
          }

          // 3. .hotreload ファイルの作成 (Obsidian Hot Reload プラグイン用)
          await fs.writeFile(path.join(targetPath, ".hotreload"), "");

          console.log(`\x1b[32m[obsidian-copy] Successfully copied to: ${targetPath}\x1b[0m`);
        } catch (err) {
          console.error(`\x1b[31m[obsidian-copy] Error: ${err instanceof Error ? err.message : String(err)}\x1b[0m`);
        }
      }
    },
  };
}
