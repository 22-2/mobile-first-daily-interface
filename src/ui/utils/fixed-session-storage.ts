import type { MFDIStorage } from "src/core/storage";
import { STORAGE_KEYS } from "src/ui/config/consntants";

export interface FixedSessionLocalMeta {
  createdAt?: string;
  name?: string;
  pinned?: boolean;
}

export type FixedSessionMetaMap = Record<string, FixedSessionLocalMeta>;

function getFixedSessionMetaStorageKey(file: string | null): string {
  if (!file) {
    return STORAGE_KEYS.FIXED_SESSION_META;
  }

  return `${STORAGE_KEYS.FIXED_SESSION_META}:${encodeURIComponent(file)}`;
}

export function readFixedSessionMeta(
  storage: MFDIStorage | null,
  file: string | null,
): FixedSessionMetaMap {
  if (!storage) {
    return {};
  }

  return storage.get<FixedSessionMetaMap>(
    getFixedSessionMetaStorageKey(file),
    {},
  );
}

export function writeFixedSessionMeta(
  storage: MFDIStorage | null,
  file: string | null,
  nextMeta: FixedSessionMetaMap,
): void {
  if (!storage) {
    return;
  }

  storage.set(getFixedSessionMetaStorageKey(file), nextMeta);
}

export function updateFixedSessionMeta(
  storage: MFDIStorage | null,
  file: string | null,
  sessionNumber: number,
  updater: (prev: FixedSessionLocalMeta) => FixedSessionLocalMeta,
): FixedSessionMetaMap {
  const current = readFixedSessionMeta(storage, file);
  const nextForSession = updater(current[String(sessionNumber)] ?? {});
  const next = {
    ...current,
    [String(sessionNumber)]: nextForSession,
  };

  writeFixedSessionMeta(storage, file, next);
  return next;
}

export function removeFixedSessionMeta(
  storage: MFDIStorage | null,
  file: string | null,
  sessionNumber: number,
): FixedSessionMetaMap {
  const current = readFixedSessionMeta(storage, file);
  const next = { ...current };

  delete next[String(sessionNumber)];
  writeFixedSessionMeta(storage, file, next);
  return next;
}
