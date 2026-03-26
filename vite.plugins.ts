import type { Plugin } from "vite";
import fs from "fs";
import path from "path";

interface ObsidianCopyOptions {
  pluginsDir: string | string[];
  targetDirName?: string;
  force?: boolean;
  files?: string[];
}

const FILES_TO_COPY = ["main.js", "manifest.json", "styles.css"];

const resolvePluginId = (targetDirName?: string): string | null => {
  if (!fs.existsSync("manifest.json")) {
    console.error(
      "obsidian-copy: [Error] manifest.json not found in current directory.",
    );
    return null;
  }
  try {
    const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
    const pluginId = targetDirName ?? manifest.id;

    if (!pluginId) {
      console.error(
        "obsidian-copy: [Error] Could not determine plugin ID. Specify 'targetDirName' or ensure 'id' exists in manifest.json.",
      );
      return null;
    }

    if (manifest.id?.includes("sample")) {
      console.warn(
        "obsidian-copy: [Warning] manifest.json 'id' still includes 'sample'. Please change it.",
      );
    }
    return pluginId;
  } catch (e) {
    console.error("obsidian-copy: [Error] Failed to parse manifest.json");
    return null;
  }
};

const copyToDir = (targetDir: string, files: string[], force: boolean) => {
  if (fs.existsSync(targetDir) && !force) {
    console.error(
      `obsidian-copy: [Error] Target directory '${targetDir}' already exists. Set 'force: true' to overwrite.`,
    );
    return;
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const file of files) {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(targetDir, file));
    } else {
      console.warn(
        `obsidian-copy: [Warning] File '${file}' not found, skipping.`,
      );
    }
  }

  // Hot Reload用ファイルの作成
  fs.writeFileSync(path.join(targetDir, ".hotreload"), "");
  console.log(`obsidian-copy: Successfully copied files to ${targetDir}`);
};

export const obsidianCopyPlugin = (options: ObsidianCopyOptions): Plugin => {
  return {
    name: "obsidian-copy",
    // apply: 'build' // ビルド時のみ実行したい場合は指定
    closeBundle: async () => {
      const {
        pluginsDir,
        targetDirName,
        force = false,
        files = FILES_TO_COPY,
      } = options;

      const pluginsDirs = Array.isArray(pluginsDir) ? pluginsDir : [pluginsDir];
      if (pluginsDirs.length === 0) {
        console.error("obsidian-copy: [Error] pluginsDir is empty.");
        return;
      }

      const pluginId = resolvePluginId(targetDirName);
      if (!pluginId) return;

      try {
        for (const dir of pluginsDirs) {
          const targetDir = path.resolve(dir, pluginId);
          copyToDir(targetDir, files, force);
        }
      } catch (err: any) {
        console.error(`obsidian-copy: [Error] ${err.message}`);
      }
    },
  };
};
