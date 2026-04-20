import { STORAGE_KEYS } from "src/ui/config/consntants";
import type { MFDINoteMode } from "src/ui/view/state";

function getFixedInputStorageKey(file: string | null): string {
  if (!file) return STORAGE_KEYS.INPUT_FIXED;

  // 意図: fixedノートごとに未送信入力を独立保持し、別ノートへ切替えても混ざらないようにする。
  return `${STORAGE_KEYS.INPUT_FIXED}:${encodeURIComponent(file)}`;
}

export function getInputStorageKey(
  noteMode: MFDINoteMode,
  file: string | null,
): string {
  return noteMode === "fixed"
    ? getFixedInputStorageKey(file)
    : STORAGE_KEYS.INPUT_PERIODIC;
}
