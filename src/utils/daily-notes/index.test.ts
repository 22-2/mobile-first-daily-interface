import { TFile, Vault } from "obsidian";
import {
  getAllTopicNotes,
  getDailyNoteSettings,
  getDateUID,
  getTopicNote,
  resolveTopicNotePath,
} from "src/utils/daily-notes/index";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Obsidian module before importing anything
vi.mock("obsidian", () => ({
  normalizePath: (p: string) => p,
  TFile: class {
    basename: string = "";
    extension: string = "";
    path: string = "";
  },
  TFolder: class {},
  Vault: {
    recurseChildren: vi.fn(),
  },
}));

// ─────────────────────────────────────────────────────────────────
// Mock Obsidian App
// ─────────────────────────────────────────────────────────────────
function setupApp(folder = "Daily") {
  (window as any).app = {
    vault: {
      getAbstractFileByPath: vi.fn(),
      getRoot: vi.fn(() => ({})),
      recurseChildren: (Vault as any).recurseChildren,
      createFolder: vi.fn(),
      create: vi.fn(),
    },
    plugins: {
      getPlugin: vi.fn(() => null),
    },
    internalPlugins: {
      getPluginById: vi.fn(() => ({
        instance: { options: { format: "YYYY-MM-DD", folder, template: "" } },
      })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setupApp("Daily");
});

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

describe("daily-notes-interface utility", () => {
  describe("getDateUID", () => {
    it("granularity=day の UID を生成する", () => {
      const m = window.moment("2026-03-04");
      const uid = getDateUID(m);
      expect(uid).toMatch(/^day-/);
    });
  });

  describe("getDailyNoteSettings", () => {
    it("コアプラグインの設定を取得できる", () => {
      const s = getDailyNoteSettings();
      expect(s.folder).toBe("Daily");
      expect(s.format).toBe("YYYY-MM-DD");
    });
  });

  describe("resolveTopicNotePath", () => {
    it("トピックなしのパスを生成する", () => {
      const date = window.moment("2026-03-04");
      const path = resolveTopicNotePath(date, "day", "");
      expect(path).toBe("Daily/2026-03-04.md");
    });

    it("トピックありのパスを生成する", () => {
      const date = window.moment("2026-03-04");
      const path = resolveTopicNotePath(date, "day", "novel");
      expect(path).toBe("Daily/novel-2026-03-04.md");
    });
  });

  describe("getAllTopicNotes", () => {
    const mockFile = (basename: string, ext: string = "md") => {
      const f = new TFile();
      f.basename = basename;
      f.extension = ext;
      return f;
    };

    beforeEach(() => {
      const mockFiles = [
        mockFile("2026-03-01"), // デフォルトトピック
        mockFile("novel-2026-03-02"), // novel トピック
        mockFile("prog-2026-03-03"), // prog トピック
        mockFile("invalid-file"), // 無効（日付なし）
        mockFile("2026-03-04", "txt"), // .md でない
      ];

      (Vault as any).recurseChildren.mockImplementation(
        (_folder: any, callback: (f: any) => void) => {
          mockFiles.forEach((f) => callback(f));
        },
      );
    });

    it("デフォルトトピックは他トピックのファイルを拾わない", () => {
      const result = getAllTopicNotes((window as any).app, "day", "");
      expect(Object.keys(result)).toHaveLength(1);
      expect(Object.values(result)[0].basename).toBe("2026-03-01");
    });

    it("特定トピックのファイルだけを取得する", () => {
      const result = getAllTopicNotes((window as any).app, "day", "novel");
      expect(Object.keys(result)).toHaveLength(1);
      expect(Object.values(result)[0].basename).toBe("novel-2026-03-02");
    });
  });

  describe("getTopicNote", () => {
    it("ノートが存在すれば TFile を返し、なければ null を返す", () => {
      const f = new TFile();
      f.basename = "2026-03-01";
      f.extension = "md";

      (Vault as any).recurseChildren.mockImplementation(
        (_folder: any, callback: (f: any) => void) => callback(f),
      );

      const found = getTopicNote(
        (window as any).app,
        window.moment("2026-03-01"),
        "day",
        "",
      );
      expect(found?.basename).toBe("2026-03-01");

      const notFound = getTopicNote(
        (window as any).app,
        window.moment("2099-12-31"),
        "day",
        "",
      );
      expect(notFound).toBeNull();
    });
  });
});
