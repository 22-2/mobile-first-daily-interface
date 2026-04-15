import "obsidian";

declare global {
  interface Element {
    isShown(): boolean;
  }
  interface MouseEvent {
    nativeEvent: MouseEvent;
  }
}
