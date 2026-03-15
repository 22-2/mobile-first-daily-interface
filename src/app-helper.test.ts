import { TFile } from "obsidian";
import { AppHelper } from "src/app-helper";
import { describe, expect, test, vi } from "vitest";

function createAppHelper(initialContent: string) {
  let content = initialContent;
  const write = vi.fn(async (_path: string, nextContent: string) => {
    content = nextContent;
  });

  const app = {
    vault: {
      adapter: {
        read: vi.fn(async () => content),
        write,
        append: vi.fn(),
      },
    },
  } as any;

  return {
    helper: new AppHelper(app),
    file: Object.assign(new TFile(), { path: "daily.md" }),
    getContent: () => content,
    write,
  };
}

describe("AppHelper.insertTextAfter", () => {
  test("insertAfter marker直後でも投稿間に余計な空行を入れない", async () => {
    const { helper, file, getContent } = createAppHelper(
      "## Thino\n- 10:00:00 old\n",
    );

    await helper.insertTextAfter(file, "\n- 11:00:00 new\n", "## Thino");

    expect(getContent()).toBe("## Thino\n- 11:00:00 new\n- 10:00:00 old\n");
  });

  test("marker の後ろに改行がない場合でも 1 つだけ補う", async () => {
    const { helper, file, getContent } = createAppHelper("## Thino");

    await helper.insertTextAfter(file, "- 11:00:00 new\n", "## Thino");

    expect(getContent()).toBe("## Thino\n- 11:00:00 new\n");
  });

  test("末尾追記でも先頭改行を正規化して空行を増やさない", async () => {
    const { helper, file, getContent } = createAppHelper("header");

    await helper.insertTextAfter(file, "\n## Thino", "");

    expect(getContent()).toBe("header\n## Thino");
  });
});
