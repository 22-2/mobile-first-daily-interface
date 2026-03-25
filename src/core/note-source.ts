import { TFile } from "obsidian";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { Granularity, MomentLike } from "src/ui/types";
import { MFDINoteMode } from "src/ui/view/state";
import {
  createTopicNote,
  resolveTopicNotePath,
  getTopicNote
} from "src/utils/daily-notes";
import {
  ensureFixedNote,
  normalizeFixedNotePath,
  resolveFixedNote
} from "src/utils/fixed-note";

export interface NoteSourceContext {
  shell: ObsidianAppShell;
  date: MomentLike;
  granularity: Granularity;
  activeTopic: string;
  noteMode: MFDINoteMode;
  fixedNotePath: string | null;
}

export interface NoteSource {
  mode: MFDINoteMode;
  resolveCurrentNote: () => TFile | null;
  ensureCurrentNote: () => Promise<TFile | null>;
  matchesPath: (filePath: string, currentNote?: TFile | null) => boolean;
}

function createFixedNoteSource(context: NoteSourceContext): NoteSource {
  return {
    mode: "fixed",
    resolveCurrentNote: () => resolveFixedNote(context.shell, context.fixedNotePath),
    ensureCurrentNote: async () => {
      if (!context.fixedNotePath) return null;
      return ensureFixedNote(context.shell, context.fixedNotePath);
    },
    matchesPath: (filePath, currentNote) => {
      const targetPath =
        currentNote?.path ?? normalizeFixedNotePath(context.fixedNotePath ?? "");
      return !!targetPath && filePath === targetPath;
    },
  };
}

function createPeriodicNoteSource(context: NoteSourceContext): NoteSource {
  return {
    mode: "periodic",
    resolveCurrentNote: () =>
      getTopicNote(
        context.shell,
        context.date,
        context.granularity,
        context.activeTopic,
      ),
    ensureCurrentNote: async () =>
      createTopicNote(
        context.shell,
        context.date,
        context.granularity,
        context.activeTopic,
      ),
    matchesPath: (filePath) =>
      filePath ===
      resolveTopicNotePath(
        context.date,
        context.granularity,
        context.activeTopic,
        context.shell,
      ),
  };
}

export function resolveNoteSource(context: NoteSourceContext): NoteSource {
  // note mode ごとの分岐を呼び出し側へ散らさず、最小契約の背後に閉じ込める。
  return context.noteMode === "fixed"
    ? createFixedNoteSource(context)
    : createPeriodicNoteSource(context);
}
