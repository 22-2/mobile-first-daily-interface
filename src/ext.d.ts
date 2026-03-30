import "obsidian";

declare global {
  interface Element {
    isShown(): boolean;
  }
}
