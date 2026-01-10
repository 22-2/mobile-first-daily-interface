import { describe, expect, test } from "@jest/globals";
import { parseThinoEntries } from "./thino";

describe("parseThinoEntries", () => {
  test("parses entries under ## Thino", () => {
    const content = [
      "# Daily",
      "",
      "## Thino",
      "- 12:53:49",
      "    ワムウよりジョジョのほうが不快っすな・・・🥺",
      "    どう思うっすか？",
      "- 19:19:57 ",
      "    化物語ってなんか押し付けがましい気がするっすな",
      "",
      "    [物語シリーズの\"幸せの強制\"](https://example.com)",
      "",
      "## Another",
      "- 00:00:00",
      "    should not be parsed",
      "",
    ].join("\n");

    const entries = parseThinoEntries(content);
    expect(entries).toHaveLength(2);

    expect(entries[0].time).toBe("12:53:49");
    expect(entries[0].message).toBe(
      [
        "ワムウよりジョジョのほうが不快っすな・・・🥺",
        "どう思うっすか？",
      ].join("\n")
    );
    expect(entries[0].offset).toBe(content.indexOf("- 12:53:49"));
    expect(entries[0].startOffset).toBe(content.indexOf("- 12:53:49"));
    expect(entries[0].bodyStartOffset).toBe(
      content.indexOf("- 12:53:49") + "- 12:53:49".length + 1
    );

    expect(entries[1].time).toBe("19:19:57");
    expect(entries[1].message).toBe(
      [
        "化物語ってなんか押し付けがましい気がするっすな",
        "",
        "[物語シリーズの\"幸せの強制\"](https://example.com)",
      ].join("\n")
    );
    expect(entries[1].offset).toBe(content.indexOf("- 19:19:57"));
    expect(entries[1].startOffset).toBe(content.indexOf("- 19:19:57"));
    expect(entries[1].bodyStartOffset).toBe(
      content.indexOf("- 19:19:57") + "- 19:19:57 ".length + 1
    );
  });

  test("returns empty when no Thino heading", () => {
    expect(parseThinoEntries("## NotThino\n- 12:00:00\n    hi")).toEqual([]);
  });
});
