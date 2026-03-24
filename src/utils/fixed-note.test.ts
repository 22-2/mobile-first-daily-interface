import { TFile } from "obsidian";
import {
  buildFixedNotePathFromName,
  buildUntitledFixedNotePath,
  createNewFixedNote,
  ensureFixedNote,
  isMFDIFixedNotePath,
  normalizeFixedNoteFolder,
  normalizeFixedNotePath,
  resolveCurrentTargetNote,
} from "src/utils/fixed-note";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("src/utils/daily-notes", () => ({
  getTopicNote: vi.fn(),
}));

describe("fixed note utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("固定ノートのフォルダを正規化する", () => {
    expect(normalizeFixedNoteFolder(" inbox/sub/ ")).toBe("inbox/sub");
    expect(normalizeFixedNoteFolder("   ")).toBe("");
  });

  it("固定ノートパスを trim して .md を補完する", () => {
    expect(normalizeFixedNotePath(" inbox/fixed-note ")).toBe(
      "inbox/fixed-note.md",
    );
    expect(normalizeFixedNotePath("inbox/fixed-note.md")).toBe(
      "inbox/fixed-note.md",
    );
  });

  it("MFDI固定ノート拡張子を判定する", () => {
    expect(isMFDIFixedNotePath("MFDI/Untitled.mfdi.md")).toBe(true);
    expect(isMFDIFixedNotePath("MFDI/Untitled.MFDI.MD")).toBe(true);
    expect(isMFDIFixedNotePath("MFDI/Untitled.md")).toBe(false);
  });

  it("fixed mode では固定ノートを優先して解決する", () => {
    const file = Object.assign(new TFile(), {
      path: "notes/fixed.md",
      basename: "fixed",
      extension: "md",
    });

    const app = {
      vault: {
        getAbstractFileByPath: vi.fn((path: string) =>
          path === "notes/fixed.md" ? file : null,
        ),
      },
    } as any;

    expect(
      resolveCurrentTargetNote({
        app,
        date: window.moment(),
        granularity: "day",
        activeTopic: "",
        noteMode: "fixed",
        fixedNotePath: "notes/fixed.md",
      }),
    ).toBe(file);
  });

  it("固定ノートが無ければフォルダを作って新規作成する", async () => {
    const created = Object.assign(new TFile(), {
      path: "notes/fixed.md",
      basename: "fixed",
      extension: "md",
    });

    const createdFolders: string[] = [];
    const app = {
      vault: {
        getAbstractFileByPath: vi.fn((path: string) => {
          if (path === "notes")
            return createdFolders.includes(path) ? {} : null;
          if (path === "notes/fixed.md") return null;
          return null;
        }),
        createFolder: vi.fn(async (path: string) => {
          createdFolders.push(path);
        }),
        create: vi.fn(async () => created),
      },
    } as any;

    const result = await ensureFixedNote(app, "notes/fixed");

    expect(app.vault.createFolder).toHaveBeenCalledWith("notes");
    expect(app.vault.create).toHaveBeenCalledWith("notes/fixed.md", "");
    expect(result).toBe(created);
  });

  it("Untitled スタイルで重複しないパスを生成する", () => {
    const app = {
      vault: {
        getAbstractFileByPath: vi.fn((path: string) => {
          if (path === "MFDI/Untitled.mfdi.md") return new TFile();
          if (path === "MFDI/Untitled 1.mfdi.md") return new TFile();
          return null;
        }),
      },
    } as any;

    expect(buildUntitledFixedNotePath("MFDI", app)).toBe(
      "MFDI/Untitled 2.mfdi.md",
    );
  });

  it("フォルダなしの場合はルートに Untitled.mfdi.md を生成する", () => {
    const app = {
      vault: { getAbstractFileByPath: vi.fn(() => null) },
    } as any;

    expect(buildUntitledFixedNotePath("", app)).toBe("Untitled.mfdi.md");
  });

  it("名前を指定してパスを生成し、重複時は連番を付ける", () => {
    const app = {
      vault: {
        getAbstractFileByPath: vi.fn((path: string) => {
          if (path === "MFDI/My Note.mfdi.md") return new TFile();
          return null;
        }),
      },
    } as any;

    expect(buildFixedNotePathFromName("MFDI", "My Note", app)).toBe(
      "MFDI/My Note 1.mfdi.md",
    );
    expect(buildFixedNotePathFromName("", "My Note", app)).toBe(
      "My Note.mfdi.md",
    );
  });

  it("名前が空文字のときは Untitled にフォールバックする", () => {
    const app = {
      vault: { getAbstractFileByPath: vi.fn(() => null) },
    } as any;

    expect(buildFixedNotePathFromName("MFDI", "", app)).toBe(
      "MFDI/Untitled.mfdi.md",
    );
  });

  it("新しい fixed note を生成して作成する", async () => {
    const created = Object.assign(new TFile(), {
      path: "MFDI/Untitled.mfdi.md",
      basename: "Untitled",
      extension: "md",
    });

    const createdFolders: string[] = [];
    const app = {
      vault: {
        getAbstractFileByPath: vi.fn((path: string) => {
          if (path === "MFDI") return createdFolders.includes(path) ? {} : null;
          return null;
        }),
        createFolder: vi.fn(async (path: string) => {
          createdFolders.push(path);
        }),
        create: vi.fn(async () => created),
      },
    } as any;

    const result = await createNewFixedNote(app, "MFDI");

    expect(app.vault.createFolder).toHaveBeenCalledWith("MFDI");
    expect(app.vault.create).toHaveBeenCalledWith("MFDI/Untitled.mfdi.md", "");
    expect(result).toBe(created);
  });
});
