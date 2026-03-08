// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePostsAndTasks, resolveTimestamp } from "./usePostsAndTasks";
import * as dailyNotes from "../../utils/daily-notes";
import * as thino from "../../utils/thino";
import { useAppContext } from "../context/AppContext";

// 簡易的な moment のモックを定義
const makeMoment = (dateStr: string) => {
  const m: any = {
    // 実際の日付計算をある程度再現する
    format: vi.fn((f: string) => {
      const d = new Date(dateStr);
      if (f === "YYYY-MM-DD") return d.toISOString().split("T")[0];
      if (f === "HH:mm:ss") return d.toISOString().split("T")[1].split(".")[0];
      if (f === "YYYY-MM-DD HH:mm:ss") {
        return `${d.toISOString().split("T")[0]} ${d.toISOString().split("T")[1].split(".")[0]}`;
      }
      return dateStr;
    }),
    subtract: vi.fn((n: number, _unit: string) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() - n);
      return makeMoment(d.toISOString());
    }),
    add: vi.fn((n: number, _unit: string) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + n);
      return makeMoment(d.toISOString());
    }),
    startOf: vi.fn((_unit: string) => makeMoment(dateStr)),
    clone: vi.fn(() => makeMoment(dateStr)),
    unix: vi.fn(() => new Date(dateStr).getTime() / 1000),
    isValid: vi.fn(() => true),
    toISOString: vi.fn(() => dateStr),
    diff: vi.fn(() => 0),
    isSame: vi.fn(() => false),
  };
  return m;
};

const mockMoment = vi.fn((val: string, format?: string) => {
  if (format === "YYYY-MM-DD HH:mm:ss" && val) {
    // "2026-03-02 16:00:00" 形式を ISO に変換してモック
    const [d, t] = val.split(" ");
    return makeMoment(`${d}T${t}.000Z`);
  }
  return makeMoment(val || "2026-03-09T12:00:00.000Z");
});
(window as any).moment = mockMoment;

vi.mock("../../utils/daily-notes", () => ({
  getTopicNote: vi.fn(),
  resolveTopicNotePath: vi.fn(),
  getPeriodicSettings: vi.fn().mockReturnValue({ format: "YYYY-MM-DD" }),
}));

vi.mock("../../utils/thino", () => ({
  parseThinoEntries: vi.fn(),
}));

vi.mock("../context/AppContext", () => ({
  useAppContext: vi.fn(),
}));

describe("resolveTimestamp", () => {
  const dateFor20260302 = makeMoment("2026-03-02T12:00:00.000Z") as any;

  it("時刻のみ（旧形式）: 日付ファイルの日付を補完してパースする", () => {
    const result = resolveTimestamp("16:00:00", dateFor20260302);
    expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2026-03-02 16:00:00");
  });

  it("日付あり（新形式）: そのままパースする", () => {
    const result = resolveTimestamp("2026-03-05 09:30:00", dateFor20260302);
    expect(result.format("YYYY-MM-DD HH:mm:ss")).toBe("2026-03-05 09:30:00");
  });
});

describe("updatePostsForDays with Topics", () => {
  const mockAppHelper = {
    cachedReadFile: vi.fn(),
    getTasks: vi.fn(),
    loadFile: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppContext as any).mockReturnValue({
      app: {},
      appHelper: mockAppHelper,
    });
  });

  it("トピック指定時に正しく複数日の投稿を取得できること", async () => {
    const mockFileTopic1 = { path: "topic-2026-03-09.md" } as any;
    const mockFileTopic2 = { path: "topic-2026-03-08.md" } as any;
    
    vi.spyOn(dailyNotes, "getTopicNote")
      .mockImplementation((_app, date, _g, topicId) => {
        const d = date.format("YYYY-MM-DD");
        if (topicId === "topic") {
          if (d === "2026-03-09") return mockFileTopic1;
          if (d === "2026-03-08") return mockFileTopic2;
        }
        return null;
      });

    vi.spyOn(thino, "parseThinoEntries").mockImplementation((content) => {
      if (content === "topic-content1") return [{ time: "10:00:00", message: "topic-post1", offset: 0, startOffset: 0, endOffset: 10, bodyStartOffset: 2 }] as any;
      if (content === "topic-content2") return [{ time: "11:00:00", message: "topic-post2", offset: 0, startOffset: 0, endOffset: 10, bodyStartOffset: 2 }] as any;
      return [];
    });

    mockAppHelper.cachedReadFile.mockImplementation((file: any) => {
      if (file.path === "topic-2026-03-09.md") return Promise.resolve("topic-content1");
      if (file.path === "topic-2026-03-08.md") return Promise.resolve("topic-content2");
      return Promise.resolve("");
    });

    const { result } = renderHook(() => usePostsAndTasks({
      postFormat: "bullet",
      date: mockMoment("2026-03-09T12:00:00.000Z") as any,
      granularity: "day"
    }));

    await act(async () => {
      await result.current.updatePostsForDays("topic", 2);
    });

    expect(result.current.posts.length).toBe(2);
    expect(result.current.posts[0].message).toBe("topic-post1");
    expect(result.current.posts[1].message).toBe("topic-post2");
    expect(result.current.posts[0].path).toBe("topic-2026-03-09.md");
  });
});
