import { STORAGE_KEYS } from "src/ui/config/consntants";
import type { MFDINoteMode } from "src/ui/view/state";

function getFixedInputStorageKey(
  file: string | null,
  fixedSessionNumber: number,
): string {
  if (!file) return STORAGE_KEYS.INPUT_FIXED;

  // 意図: fixedノートでは session 単位で draft を分離し、会話を切り替えても入力が混ざらないようにする。
  return `${STORAGE_KEYS.INPUT_FIXED}:${encodeURIComponent(file)}:${fixedSessionNumber}`;
}

function getFixedDraftMetadataStorageKey(
  file: string | null,
  fixedSessionNumber: number,
): string {
  if (!file) return STORAGE_KEYS.INPUT_FIXED_DRAFT_METADATA;

  // 意図: 本文だけでなく pin/tag 下書きも session 単位で復元できるように同じ粒度で保存する。
  return `${STORAGE_KEYS.INPUT_FIXED_DRAFT_METADATA}:${encodeURIComponent(file)}:${fixedSessionNumber}`;
}

export function getInputStorageKey(
  noteMode: MFDINoteMode,
  file: string | null,
  fixedSessionNumber = 1,
): string {
  return noteMode === "fixed"
    ? getFixedInputStorageKey(file, fixedSessionNumber)
    : STORAGE_KEYS.INPUT_PERIODIC;
}

export function getDraftMetadataStorageKey(
  noteMode: MFDINoteMode,
  file: string | null,
  fixedSessionNumber = 1,
): string {
  return noteMode === "fixed"
    ? getFixedDraftMetadataStorageKey(file, fixedSessionNumber)
    : STORAGE_KEYS.INPUT_PERIODIC_DRAFT_METADATA;
}
