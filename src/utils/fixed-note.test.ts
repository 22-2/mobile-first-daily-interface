import { TFile } from "obsidian";
import {
  buildNewFixedNotePath,
  createNewFixedNote,
  ensureFixedNote,
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
          if (path === "notes") return createdFolders.includes(path) ? {} : null;
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

  it("新しい fixed note 用のパスを作成先フォルダ配下に生成する", () => {
    const now = window.moment("2026-03-19 03:30:45", "YYYY-MM-DD HH:mm:ss");

    expect(buildNewFixedNotePath("MFDI", now)).toBe(
      "MFDI/MFDI-2026-03-19-033045.md",
    );
    expect(buildNewFixedNotePath("", now)).toBe(
      "MFDI-2026-03-19-033045.md",
    );
  });

  it("新しい fixed note を生成して作成する", async () => {
    const created = Object.assign(new TFile(), {
      path: "MFDI/MFDI-2026-03-19-033045.md",
      basename: "MFDI-2026-03-19-033045",
      extension: "md",
    });

    vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-19T03:30:45"));

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
    expect(app.vault.create).toHaveBeenCalledWith(
      "MFDI/MFDI-2026-03-19-033045.md",
      "",
    );
    expect(result).toBe(created);

    vi.useRealTimers();
  });
});
