import { TFile, Vault } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Obsidian module before importing granularity-config
vi.mock("obsidian", () => {
  return {
    normalizePath: (p: string) => p,
    TFile: class {
        basename: string;
        extension: string;
    },
    Vault: {
      recurseChildren: vi.fn(),
    },
  };
});

import { getAllTopicNotes, resolveTopicNotePath } from "./granularity-config";

// Mock Moment
const createMockMoment = (initialDateStr: string) => {
  let d = new Date(initialDateStr);
  const mock: any = {
    isValid: () => !isNaN(d.getTime()),
    format: (f: string) => {
      if (f === "YYYY-MM-DD") return d.toISOString().split('T')[0];
      return initialDateStr;
    },
    clone: () => createMockMoment(d.toISOString()),
    startOf: () => mock,
  };
  return mock;
};

const momentMock: any = vi.fn((input) => {
    if (typeof input === 'string') return createMockMoment(input);
    return createMockMoment(new Date().toISOString());
});
(window as any).moment = momentMock;

// Mock Obsidian App
(window as any).app = {
  vault: {
    getAbstractFileByPath: vi.fn(),
    getRoot: vi.fn(() => ({})),
    recurseChildren: (Vault as any).recurseChildren,
  },
  plugins: { getPlugin: vi.fn() },
  internalPlugins: { getPluginById: vi.fn() },
};

describe("granularity-config topic logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock settings
    (window as any).app.plugins.getPlugin.mockReturnValue({
      settings: {
        daily: { format: "YYYY-MM-DD", folder: "Daily", enabled: true }
      }
    });
  });

  describe("resolveTopicNotePath", () => {
    it("should resolve path for default topic (empty id)", () => {
      const date = createMockMoment("2026-03-04");
      const path = resolveTopicNotePath(date, "day", "");
      expect(path).toBe("Daily/2026-03-04.md");
    });

    it("should resolve path for named topic", () => {
      const date = createMockMoment("2026-03-04");
      const path = resolveTopicNotePath(date, "day", "novel");
      expect(path).toBe("Daily/novel-2026-03-04.md");
    });
  });

  describe("getAllTopicNotes", () => {
    it("should filter notes by topic prefix", () => {
      const mockFile = (basename: string, ext: string) => {
        const f = new TFile();
        f.basename = basename;
        f.extension = ext;
        return f;
      };

      const mockFiles = [
        mockFile("2026-03-01", "md"),
        mockFile("novel-2026-03-02", "md"),
        mockFile("prog-2026-03-03", "md"),
        mockFile("invalid-file", "md"),
      ];

      (Vault as any).recurseChildren.mockImplementation((folder, callback) => {
        mockFiles.forEach(f => callback(f));
      });

      // Default topic (should only pick files matching format exactly without prefixes)
      const defaultNotes = getAllTopicNotes("day", "");
      expect(Object.keys(defaultNotes)).toHaveLength(1);
      expect(Object.values(defaultNotes)[0].basename).toBe("2026-03-01");

      // Novel topic
      const novelNotes = getAllTopicNotes("day", "novel");
      expect(Object.keys(novelNotes)).toHaveLength(1);
      expect(Object.values(novelNotes)[0].basename).toBe("novel-2026-03-02");
    });
  });
});
