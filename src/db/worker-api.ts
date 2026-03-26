import type { Granularity } from "src/ui/types";
import type { MemoRecord } from "src/db/mfdi-db";

export interface ScannableNote {
  path: string;
  noteName: string;
  topicId: string;
  noteGranularity: Granularity;
  noteDate: string;
  content: string;
}

export interface ScanWorkerAPI {
  // Worker is stateless and only exposes parsing methods.
  scanFiles(files: ScannableNote[]): Promise<MemoRecord[]>;
  scanFile(file: ScannableNote): Promise<MemoRecord[]>;
  dispose(): Promise<void>;
}
