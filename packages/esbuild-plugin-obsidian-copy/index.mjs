import fs from "fs";
import path from "path";

/**
 * esbuild plugin to copy Obsidian plugin files to a target plugins directory.
 * 
 * @param {Object} options
 * @param {string} options.pluginsDir - The base plugins directory (e.g., path to your vault's .obsidian/plugins)
 * @param {boolean} [options.force=false] - If true, overwrite even if target directory exists.
 */
export const obsidianCopyPlugin = (options = {}) => {
  const { pluginsDir, force = false } = options;

  return {
    name: "obsidian-copy",
    setup(build) {
      build.onEnd(async (result) => {
        if (result.errors.length > 0) return;

        if (!pluginsDir) {
          console.error("obsidian-copy: [Error] pluginsDir is not specified in options.");
          return;
        }

        try {
          if (!fs.existsSync("manifest.json")) {
            console.error("obsidian-copy: [Error] manifest.json not found in current directory.");
            return;
          }

          const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
          const pluginId = manifest.id;

          if (!pluginId) {
            console.error("obsidian-copy: [Error] 'id' not found in manifest.json.");
            return;
          }

          if (pluginId === "sample-plugin") {
            console.warn("obsidian-copy: [Warning] plugin-id is 'sample-plugin'. Please change it in manifest.json.");
          }

          const targetDir = path.join(pluginsDir, pluginId);

          if (fs.existsSync(targetDir) && !force) {
            console.error(`obsidian-copy: [Error] Target directory '${targetDir}' already exists. Use 'force: true' to overwrite.`);
            return;
          }

          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          const filesToCopy = ["main.js", "manifest.json", "styles.css"];
          for (const file of filesToCopy) {
            if (fs.existsSync(file)) {
              fs.copyFileSync(file, path.join(targetDir, file));
            }
          }

          // Hotreload support
          fs.writeFileSync(path.join(targetDir, ".hotreload"), "");

          console.log(`obsidian-copy: Successfully copied files to ${targetDir}`);
        } catch (err) {
          console.error(`obsidian-copy: [Error] ${err.message}`);
        }
      });
    },
  };
};

export default obsidianCopyPlugin;
