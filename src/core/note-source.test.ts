import { TFile } from "obsidian";
import {
  createFixedNoteFromInput,
  resolveNoteSource
} from "src/core/note-source";
import { describe, expect, it, vi } from "vitest";

vi.mock("src/utils/daily-notes", () => ({
  getTopicNote: vi.fn((shell: any, _date: any, _g: any, _topicId: any) =>
    shell.getAbstractFileByPath("daily/2026-03-15.md"),
  ),
  createTopicNote: vi.fn(async (shell: any, _date: any, _g: any, _topicId: any) =>
    shell.createFile("daily/2026-03-15.md", ""),
  ),
  resolveTopicNotePath: vi.fn(() => "daily/2026-03-15.md"),
}));

describe("resolveNoteSource", () => {
  const dailyFile = Object.assign(new TFile(), {
    path: "daily/2026-03-15.md",
    basename: "2026-03-15",
    extension: "md",
  });
  const fixedFile = Object.assign(new TFile(), {
    path: "MFDI/Inbox.mfdi.md",
    basename: "Inbox.mfdi",
    extension: "md",
  });

  const shell = {
    getAbstractFileByPath: vi.fn((path: string) => {
      if (path === dailyFile.path) return dailyFile;
      if (path === fixedFile.path) return fixedFile;
      return null;
    }),
    createFolder: vi.fn(async () => {}),
    createFile: vi.fn(async (path: string) =>
      Object.assign(new TFile(), { path, basename: path, extension: "md" }),
    ),
  } as any;

  it("resolves periodic notes by path and context", () => {
    const source = resolveNoteSource({
      shell,
      date: window.moment("2026-03-15T00:00:00.000Z"),
      granularity: "day",
      activeTopic: "",
      noteMode: "periodic",
      fixedNotePath: null,
    });

    expect(source.mode).toBe("periodic");
    expect(source.resolveCurrentNote()).toBe(dailyFile);
    expect(source.matchesPath(dailyFile.path)).toBe(true);
  });

  it("resolves fixed notes from fixed path", () => {
    const source = resolveNoteSource({
      shell,
      date: window.moment("2026-03-15T00:00:00.000Z"),
      granularity: "day",
      activeTopic: "",
      noteMode: "fixed",
      fixedNotePath: "MFDI/Inbox.mfdi.md",
    });

    expect(source.mode).toBe("fixed");
    expect(source.resolveCurrentNote()).toBe(fixedFile);
    expect(source.matchesPath(fixedFile.path)).toBe(true);
  });

  it("creates a fixed note from user input through the core helper", async () => {
    const created = await createFixedNoteFromInput(shell, "MFDI", "Scratch");

    expect(shell.createFile).toHaveBeenCalledWith("MFDI/Scratch.mfdi.md", "");
    expect(created.path).toBe("MFDI/Scratch.mfdi.md");
  });
});
