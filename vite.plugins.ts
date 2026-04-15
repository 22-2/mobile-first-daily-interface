import fs from "fs";
import path from "path";
import { type Plugin } from "vite";

// obsidianCopyPlugin は esbuild の onEnd フックを使う esbuild プラグインのため、
// Vite（Rollup ベースビルド）では onEnd が発火しない。
// Vite の closeBundle フックを使う等価実装に置き換える。
const FILES_TO_COPY = ["main.js", "manifest.json", "styles.css"];

export function obsidianViteCopyPlugin(options: {
  pluginsDir: string | string[];
  targetDirName: string;
  force?: boolean;
  files?: string[];
}): Plugin {
  const { pluginsDir, targetDirName, force = false, files = FILES_TO_COPY } = options;

  return {
    name: "obsidian-copy",
    apply: "build",
    closeBundle() {
      const dirs = Array.isArray(pluginsDir) ? pluginsDir : [pluginsDir];
      for (const dir of dirs) {
        const targetDir = path.resolve(dir, targetDirName);
        if (fs.existsSync(targetDir) && !force) {
          console.error(`obsidian-copy: [Error] '${targetDir}' already exists. Set force: true to overwrite.`);
          continue;
        }
        fs.mkdirSync(targetDir, { recursive: true });
        for (const file of files) {
          if (fs.existsSync(file)) {
            fs.copyFileSync(file, path.join(targetDir, file));
          }
        }
        fs.writeFileSync(path.join(targetDir, ".hotreload"), "");
        console.log(`obsidian-copy: Copied to ${targetDir}`);
      }
    },
  };
}
