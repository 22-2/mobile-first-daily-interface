import {
  inferNoteIdentityFromFile,
  inferNoteIdentityFromFilename,
} from "src/db/note-file-identity";
import { describe, expect, test } from "vitest";

describe("note file identity inference", () => {
  test("infers the default topic daily note", () => {
    const identity = inferNoteIdentityFromFilename("2026-03-23", ["", "writing"]);

    expect(identity).not.toBeNull();
    expect(identity?.topicId).toBe("");
    expect(identity?.granularity).toBe("day");
    expect(identity?.noteDate.format("YYYY-MM-DD")).toBe("2026-03-23");
  });

  test("infers a hyphenated topic id safely", () => {
    const identity = inferNoteIdentityFromFilename("deep-work-2026-03-23", [
      "",
      "deep-work",
      "deep",
    ]);

    expect(identity).not.toBeNull();
    expect(identity?.topicId).toBe("deep-work");
    expect(identity?.granularity).toBe("day");
  });

  test("returns null when nothing matches", () => {
    expect(inferNoteIdentityFromFilename("not-a-note", ["", "writing"])).toBeNull();
  });

  test("accepts a TFile-like object", () => {
    const identity = inferNoteIdentityFromFile(
      { basename: "writing-2026-03" } as never,
      ["", "writing"],
    );

    expect(identity).not.toBeNull();
    expect(identity?.topicId).toBe("writing");
    expect(identity?.granularity).toBe("month");
  });
});
