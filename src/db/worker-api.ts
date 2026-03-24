import { Granularity } from "src/ui/types";

export interface ScannableNote {
  path: string;
  noteName: string;
  topicId: string;
  noteGranularity: Granularity;
  noteDate: string;
  content: string;
}

export interface ScanWorkerAPI {
  initialize(args: { appId: string }): Promise<void>;
  resetIndex(): Promise<void>;
  scanFiles(files: ScannableNote[]): Promise<void>;
  scanFile(file: ScannableNote): Promise<void>;
  removeFile(path: string): Promise<void>;
  rebuildTagStats(): Promise<void>;
  setMeta(key: string, value: string): Promise<void>;
  dispose(): Promise<void>;
}
