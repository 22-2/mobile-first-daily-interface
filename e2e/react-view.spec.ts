import type { Page } from "@playwright/test";
import path from "node:path";
import type { ObsidianAPI } from "obsidian-e2e-toolkit";
import { expect, test } from "obsidian-e2e-toolkit";
import type { MFDIView } from "src/ui/view/MFDIView";

const PLUGIN_PATH = path.resolve(".");
const HOST_FILE_PATH = "mfdi-e2e-react-host.md";

test.use({
  vaultOptions: {
    fresh: true,
    logLevel: "debug",
    plugins: [
      {
        path: PLUGIN_PATH,
      },
    ],
  },
});

async function waitForMFDIReady(obsidian: ObsidianAPI, page: Page) {
  await obsidian.waitReady();
  await obsidian.waitForPluginEnabled("mobile-first-daily-interface");

  await obsidian.save(HOST_FILE_PATH, "");
  await obsidian.open(HOST_FILE_PATH);
  await obsidian.waitReady();

  await obsidian.command("mobile-first-daily-interface:mfdi-open-view");
  await obsidian.waitForViewType("mfdi-view");

  await expect(page.getByText("タイムライン表示中")).toBeVisible({ timeout: 15000 });

  const liveEditor = page.locator(".mfdi-input-area .cm-content");
  await expect(liveEditor).toBeVisible({ timeout: 15000 });

  return liveEditor;
}

async function setLiveEditorContent(obsidian: ObsidianAPI, text: string) {
  await obsidian.page.evaluate((content) => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!leaf) {
      throw new Error("mfdi-view leaf not found");
    }

    if (!(leaf.view as MFDIView).handlers.onSetLiveEditorContentForTesting) {
      throw new Error("onSetLiveEditorContentForTesting is not ready");
    }

    (leaf.view as MFDIView).handlers.onSetLiveEditorContentForTesting!(content);
  }, text);

  await expect.poll(() => getLiveEditorContent(obsidian)).toBe(text);
}

async function getLiveEditorContent(obsidian: ObsidianAPI) {
  return obsidian.page.evaluate(() => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!leaf) {
      throw new Error("mfdi-view leaf not found");
    }

    if (!(leaf.view as MFDIView).handlers.onGetLiveEditorContentForTesting) {
      throw new Error("onGetLiveEditorContentForTesting is not ready");
    }

    return (leaf.view as MFDIView).handlers.onGetLiveEditorContentForTesting!();
  });
}

test.describe("MFDI react view e2e", () => {
  test("ビュー表示中に日付が変わって新規日次ノート作成後も投稿がリストに表示される", async ({ obsidian }) => {
    await waitForMFDIReady(obsidian, obsidian.page);

    const dateShift = await obsidian.page.evaluate(() => {
      const now = window.moment();
      const beforeDay = now.format("YYYY-MM-DD");
      const nextDayMs = now.clone().add(1, "day").add(1, "minute").valueOf();
      window.moment.now = () => nextDayMs;
      const afterDay = window.moment().format("YYYY-MM-DD");
      return {
        beforeDay,
        afterDay,
        nextDayPath: `${afterDay}.md`,
      };
    });

    expect(dateShift.afterDay).not.toBe(dateShift.beforeDay);
    expect(dateShift.nextDayPath).toBe(`${dateShift.afterDay}.md`);

    const message = `cross-day-post-${Date.now()}`;
    await setLiveEditorContent(obsidian, message);

    await obsidian.page.getByRole("button", { name: "投稿" }).click();

    await expect.poll(async () => {
      const content = await obsidian.read(dateShift.nextDayPath);
      return content.includes(message);
    }).toBe(true);

    await expect.poll(async () => {
      const count = await obsidian.page
        .locator(".list .markdown-rendered", { hasText: message })
        .count();
      return count;
    }).toBe(1);
  });
});
