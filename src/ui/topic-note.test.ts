import { TFile, Vault } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Obsidian module before importing topic-note
vi.mock("obsidian", () => ({
  normalizePath: (p: string) => p,
  TFile: class {
    basename: string = "";
    extension: string = "";
    path: string = "";
  },
  Vault: {
    recurseChildren: vi.fn(),
  },
}));

import {
    getAllTopicNotes,
    getDateUID,
    getTopicNote,
    resolveTopicNotePath
} from "./topic-note";

// ─────────────────────────────────────────────────────────────────
// Mock moment
// ─────────────────────────────────────────────────────────────────
const createMockMoment = (initialDateStr: string) => {
  let d = new Date(initialDateStr);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: any = {
    isValid: () => !isNaN(d.getTime()),
    format: (f: string) => {
      if (f === "YYYY-MM-DD") return d.toISOString().split("T")[0];
      return initialDateStr;
    },
    clone: () => createMockMoment(d.toISOString()),
    startOf: () => mock,
  };
  return mock;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const momentMock: any = vi.fn((input: any, _format?: any, _strict?: any) => {
  if (typeof input === "string") return createMockMoment(input);
  return createMockMoment(new Date().toISOString());
});
(window as any).moment = momentMock;

// ─────────────────────────────────────────────────────────────────
// Mock Obsidian App (daily-notes core plugin, YYYY-MM-DD format)
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
      getPlugin: vi.fn(() => null), // periodic-notes 無効
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
// getDateUID
// ─────────────────────────────────────────────────────────────────
describe("getDateUID", () => {
  it("granularity=day のデフォルト UID を生成する", () => {
    const m = createMockMoment("2026-03-04");
    const uid = getDateUID(m);
    expect(uid).toMatch(/^day-/);
  });

  it("granularity を指定すると prefix が変わる", () => {
    const m = createMockMoment("2026-03-04");
    const uid = getDateUID(m, "week");
    expect(uid).toMatch(/^week-/);
  });
});

// ─────────────────────────────────────────────────────────────────
// resolveTopicNotePath
// ─────────────────────────────────────────────────────────────────
describe("resolveTopicNotePath", () => {
  it("デフォルトトピック（空ID）はプレフィックスなしのパスを返す", () => {
    const date = createMockMoment("2026-03-04");
    const path = resolveTopicNotePath(date, "day", "");
    expect(path).toBe("Daily/2026-03-04.md");
  });

  it("名前付きトピックはプレフィックス付きのパスを返す", () => {
    const date = createMockMoment("2026-03-04");
    const path = resolveTopicNotePath(date, "day", "novel");
    expect(path).toBe("Daily/novel-2026-03-04.md");
  });

  it("フォルダが空のときはフォルダパスなしで返す", () => {
    setupApp(""); // folder = ""
    const date = createMockMoment("2026-03-04");
    const path = resolveTopicNotePath(date, "day", "");
    expect(path).toBe("2026-03-04.md");
  });
});

// ─────────────────────────────────────────────────────────────────
// getAllTopicNotes
// ─────────────────────────────────────────────────────────────────
describe("getAllTopicNotes", () => {
  const mockFile = (basename: string, ext: string = "md") => {
    const f = new TFile();
    f.basename = basename;
    f.extension = ext;
    return f;
  };

  beforeEach(() => {
    const mockFiles = [
      mockFile("2026-03-01"),        // デフォルトトピック
      mockFile("novel-2026-03-02"), // novel トピック
      mockFile("prog-2026-03-03"),  // prog トピック
      mockFile("invalid-file"),      // 無効（日付なし）
      mockFile("2026-03-04", "txt"), // .md でない → 除外
    ];

    (Vault as any).recurseChildren.mockImplementation(
      (_folder: any, callback: (f: any) => void) => {
        mockFiles.forEach((f) => callback(f));
      }
    );
  });

  it("デフォルトトピック（空ID）は他トピックのファイルを拾わない", () => {
    const result = getAllTopicNotes("day", "");
    expect(Object.keys(result)).toHaveLength(1);
    expect(Object.values(result)[0].basename).toBe("2026-03-01");
  });

  it("novel トピックは novel- プレフィックスのファイルだけを返す", () => {
    const result = getAllTopicNotes("day", "novel");
    expect(Object.keys(result)).toHaveLength(1);
    expect(Object.values(result)[0].basename).toBe("novel-2026-03-02");
  });

  it("prog トピックは prog- プレフィックスのファイルだけを返す", () => {
    const result = getAllTopicNotes("day", "prog");
    expect(Object.keys(result)).toHaveLength(1);
    expect(Object.values(result)[0].basename).toBe("prog-2026-03-03");
  });

  it("無効ファイルや .md でないファイルは除外される", () => {
    const result = getAllTopicNotes("day", "");
    const basenames = Object.values(result).map((f) => f.basename);
    expect(basenames).not.toContain("invalid-file");
    expect(basenames).not.toContain("2026-03-04"); // txt
  });
});

// ─────────────────────────────────────────────────────────────────
// getTopicNote
// ─────────────────────────────────────────────────────────────────
describe("getTopicNote", () => {
  it("該当ノートが存在する場合は TFile を返す", () => {
    const f = new TFile();
    f.basename = "2026-03-01";
    f.extension = "md";

    (Vault as any).recurseChildren.mockImplementation(
      (_folder: any, callback: (f: any) => void) => callback(f)
    );

    const result = getTopicNote(createMockMoment("2026-03-01"), "day", "");
    expect(result?.basename).toBe("2026-03-01");
  });

  it("該当ノートが存在しない場合は null を返す", () => {
    (Vault as any).recurseChildren.mockImplementation(() => {});

    const result = getTopicNote(createMockMoment("2099-12-31"), "day", "");
    expect(result).toBeNull();
  });
});
