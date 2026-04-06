import { STORAGE_KEYS } from "src/ui/config/consntants";
import type { MFDINoteMode } from "src/ui/view/state";

function getFixedInputStorageKey(fixedNotePath: string | null): string {
  if (!fixedNotePath) return STORAGE_KEYS.INPUT_FIXED;

  // 意図: fixedノートごとに未送信入力を独立保持し、別ノートへ切替えても混ざらないようにする。
  return `${STORAGE_KEYS.INPUT_FIXED}:${encodeURIComponent(fixedNotePath)}`;
}

export function getInputStorageKey(
  noteMode: MFDINoteMode,
  fixedNotePath: string | null,
): string {
  return noteMode === "fixed"
    ? getFixedInputStorageKey(fixedNotePath)
    : STORAGE_KEYS.INPUT_PERIODIC;
}
