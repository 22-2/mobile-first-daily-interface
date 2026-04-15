import { Plugin } from "obsidian";

// Paper Cut Plugin のエントリポイント
// Ulysses/Scrivener ライクな執筆ツール。MFDI のコード資産を最大限に再利用する。
export default class PaperCutPlugin extends Plugin {
  async onload() {
    console.log("Paper Cut Plugin loaded");
  }

  onunload() {
    console.log("Paper Cut Plugin unloaded");
  }
}
