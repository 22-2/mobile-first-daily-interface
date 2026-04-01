import { TFile } from "obsidian";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { describe, expect, test, vi } from "vitest";

function createShell(initialContent: string) {
  let content = initialContent;
  const file = Object.assign(new TFile(), { path: "daily.md" });
  const write = vi.fn(async (_path: string, nextContent: string) => {
    content = nextContent;
  });
  const modify = vi.fn(async (_file: TFile, nextContent: string) => {
    content = nextContent;
  });

  const app = {
    vault: {
      getAbstractFileByPath: vi.fn(() => file),
      modify,
      adapter: {
        read: vi.fn(async () => content),
        write,
        append: vi.fn(),
      },
    },
  } as any;

  return {
    helper: new ObsidianAppShell(app),
    file,
    getContent: () => content,
    modify,
    write,
  };
}

describe("ObsidianAppShell.insertTextAfter", () => {
  test("insertAfter marker直後でも投稿間に余計な空行を入れない", async () => {
    const { helper, file, getContent } = createShell(
      "## Thino\n- 10:00:00 old\n",
    );

    await helper.insertTextAfter(file, "\n- 11:00:00 new\n", "## Thino");

    expect(getContent()).toBe("## Thino\n- 11:00:00 new\n- 10:00:00 old\n");
  });

  test("marker の後ろに改行がない場合でも 1 つだけ補う", async () => {
    const { helper, file, getContent } = createShell("## Thino");

    await helper.insertTextAfter(file, "- 11:00:00 new\n", "## Thino");

    expect(getContent()).toBe("## Thino\n- 11:00:00 new\n");
  });

  test("末尾追記でも先頭改行を正規化して空行を増やさない", async () => {
    const { helper, file, getContent } = createShell("header");

    await helper.insertTextAfter(file, "\n## Thino", "");

    expect(getContent()).toBe("header\n## Thino");
  });

  test("既存ノート更新は vault.modify を優先する", async () => {
    const { helper, file, modify, write } = createShell("## Thino\n");

    await helper.insertTextAfter(file, "- 11:00:00 new\n", "## Thino");

    expect(modify).toHaveBeenCalledWith(file, "## Thino\n- 11:00:00 new\n");
    expect(write).not.toHaveBeenCalled();
  });

  test("replaceRange も vault.modify 経由で既存ノートを書き換える", async () => {
    const { helper, file, modify, write, getContent } = createShell(
      "before old after",
    );

    await helper.replaceRange(file.path, 7, 10, "new");

    expect(getContent()).toBe("before new after");
    expect(modify).toHaveBeenCalledWith(file, "before new after");
    expect(write).not.toHaveBeenCalled();
  });
});
