import type { Page } from "@playwright/test";
import path from "node:path";
import type { ObsidianAPI } from "obsidian-e2e-toolkit";
import { expect, test } from "obsidian-e2e-toolkit";
import type { MFDIView } from "src/ui/view/MFDIView";

const PLUGIN_PATH = path.resolve(".");
const HOST_FILE_PATH = "mfdi-e2e-host.md";

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

  const liveEditor = page.locator(".mfdi-input-area .cm-content");

  await expect(liveEditor).toBeVisible({ timeout: 15000 });
  return liveEditor;
}

async function openModalFromKeyboard(page: Page) {
  await page.keyboard.press("Control+Shift+Alt+O");
  const modalEditor = page.locator(".mfdi-modal-editor .cm-content");
  await expect(modalEditor).toBeVisible({ timeout: 10000 });
  return modalEditor;
}

async function registerAppScopeHotkeyCounter(
  obsidian: ObsidianAPI,
  counterKey: string,
  modifiers: string[],
  key: string,
) {
  await obsidian.page.evaluate(
    ({ counterKey, modifiers, key }) => {
      const globalState = (
        window as Window & {
          __mfdiE2EHotkeys?: Record<string, { count: number; handler: unknown }>;
        }
      );
      globalState.__mfdiE2EHotkeys ??= {};

      const existing = globalState.__mfdiE2EHotkeys[counterKey];
      if (existing?.handler) {
        app.scope.unregister(existing.handler as never);
      }

      const handler = app.scope.register(modifiers as never, key, () => {
        globalState.__mfdiE2EHotkeys![counterKey].count += 1;
        return false;
      });

      globalState.__mfdiE2EHotkeys[counterKey] = {
        count: 0,
        handler,
      };
    },
    { counterKey, modifiers, key },
  );
}

async function getAppScopeHotkeyCount(obsidian: ObsidianAPI, counterKey: string) {
  return obsidian.page.evaluate((key) => {
    const globalState = (
      window as Window & {
        __mfdiE2EHotkeys?: Record<string, { count: number }>;
      }
    );
    return globalState.__mfdiE2EHotkeys?.[key]?.count ?? 0;
  }, counterKey);
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

  const liveEditor = obsidian.page.locator(".mfdi-input-area .cm-content");
  await liveEditor.click();

  await expect.poll(() => getLiveEditorContent(obsidian)).toBe(text);
  await expect.poll(async () => {
    return obsidian.page.evaluate(() => {
      return app.workspace.activeEditor?.editor?.getValue() ?? null;
    });
  }).toBe(text);
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

// DO NOT EDIT: This is a helper function for the test "ライブエディタで Escape キーでマルチカーソルが解除される" to create a multi-cursor selection in the live editor. It simulates the user action of adding a new cursor on the next line. The implementation uses Obsidian's API to manipulate the editor's selections directly.
// copy from obsidian-advanced-cursor plugin:
async function getLiveEditorSelectionCount(obsidian: ObsidianAPI): Promise<number> {
  return obsidian.page.evaluate(() => {
    const editor = app.workspace.activeEditor?.editor;
    if (!editor) {
      throw new Error("active editor not found");
    }

    return editor.listSelections().length;
  });
}

// DO NOT EDIT: This is a helper function for the test "ライブエディタで Escape キーでマルチカーソルが解除される" to create a multi-cursor selection in the live editor. It simulates the user action of adding a new cursor on the next line. The implementation uses Obsidian's API to manipulate the editor's selections directly.
// copy from obsidian-advanced-cursor plugin:
async function createLiveEditorMulticursor(obsidian: ObsidianAPI): Promise<void> {
  await obsidian.page.evaluate(() => {
    const editor = app.workspace.activeEditor?.editor;
    if (!editor) {
      throw new Error("active editor not found");
    }

    const selections = editor.listSelections().map((selection) => ({
      anchor: selection.anchor,
      head: selection.head,
    }));
    const { ch, line } = selections[selections.length - 1].anchor;

    const nextLine = line + 1;
    const nextChar = Math.min(ch, editor.getLine(nextLine).length);
    const nextCursor = {
      line: nextLine,
      ch: nextChar,
    };

    selections.push({ anchor: nextCursor, head: nextCursor });
    editor.setSelections(selections);
  });
}

test.describe("MFDI live editor e2e", () => {
  test("mfdiビュー起動時に view 未初期化エラーを出さない", async ({ obsidian }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    obsidian.page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });
    obsidian.page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await waitForMFDIReady(obsidian, obsidian.page);
    await obsidian.page.waitForTimeout(500);

    const startupErrors = [...pageErrors, ...consoleErrors].join("\n");
    expect(startupErrors).not.toContain(
      "Cannot read properties of undefined (reading 'view')",
    );
  });

  test("タイムライン中にカレンダー日付を押すとフォーカス表示へ戻る", async ({ obsidian }) => {
    await waitForMFDIReady(obsidian, obsidian.page);

    await expect(obsidian.page.getByText("タイムライン表示中")).toBeVisible();
    await obsidian.page.locator(".mini-calendar__day-cell").first().click();

    await expect(obsidian.page.locator(".mfdi-date-input")).toBeVisible();
    await expect(obsidian.page.getByText("タイムライン表示中")).toHaveCount(0);
  });

  test("ライブエディタで Playwright fill が使える", async ({ obsidian }) => {
    const liveEditor = await waitForMFDIReady(obsidian, obsidian.page);

    await liveEditor.click();
    await liveEditor.fill("Playwright live typing");
    await obsidian.page.waitForTimeout(200);

    await expect(liveEditor).toContainText("Playwright live typing");
  });

  test("scoped ホットキーでモーダルエディタを開ける", async ({ obsidian }) => {
    const liveEditor = await waitForMFDIReady(obsidian, obsidian.page);

    await registerAppScopeHotkeyCounter(
      obsidian,
      "open-modal-parent",
      ["Ctrl", "Shift", "Alt"],
      "o",
    );

    await liveEditor.click();
    const modalEditor = await openModalFromKeyboard(obsidian.page);

    await expect(modalEditor).toBeVisible();
    await expect.poll(() => getAppScopeHotkeyCount(obsidian, "open-modal-parent")).toBe(0);
  });

  test("Escape キーで MFDIEditorModal が閉じる", async ({ obsidian }) => {
    const liveEditor = await waitForMFDIReady(obsidian, obsidian.page);

    await liveEditor.click();
    await openModalFromKeyboard(obsidian.page);
    await obsidian.page.waitForTimeout(300);

    await obsidian.page.keyboard.press("Escape");
    await expect(obsidian.page.locator(".mfdi-modal-editor")).not.toBeVisible();
    await expect(liveEditor).toBeVisible();
  });

  test("ライブエディタで Escape キーでマルチカーソルが解除される", async ({ obsidian }) => {
    const liveEditor = await waitForMFDIReady(obsidian, obsidian.page);
    await liveEditor.click();
    await obsidian.page.waitForTimeout(300);

    // テキストを設定：最低 15 文字必要（2 つ目の選択範囲のため）
    await setLiveEditorContent(obsidian, "h\ne\nl\nlo\n w\no\nr\nl\nd\n t\ne\ns\nt");
    await obsidian.page.waitForTimeout(300);

    // マルチカーソルを作成（2 つの選択範囲）
    await createLiveEditorMulticursor(obsidian);
    await expect.poll(() => getLiveEditorSelectionCount(obsidian)).toBe(2);

    // Escape キーを押してマルチカーソルを解除
    await obsidian.page.keyboard.press("Escape");
    await expect.poll(() => getLiveEditorSelectionCount(obsidian)).toBe(1);
  });

  test("モーダルエディタで fill できてライブエディタに同期される", async ({ obsidian, page }) => {
    const liveEditor = await waitForMFDIReady(obsidian, obsidian.page);

    await liveEditor.click();
    const modalEditor = await openModalFromKeyboard(obsidian.page);

    await modalEditor.click();
    await modalEditor.fill("Modal sync text");
    await obsidian.page.waitForTimeout(200);

    await expect(modalEditor).toContainText("Modal sync text");
    await expect(liveEditor).toContainText("Modal sync text");

    await obsidian.page.keyboard.press("Escape");
    await expect(obsidian.page.locator(".mfdi-modal-editor")).not.toBeVisible();
    await expect(liveEditor).toContainText("Modal sync text");
  });

  test("Ctrl+Enter では MFDIView の Scope のみが呼ばれる", async ({ obsidian }) => {
    const liveEditor = await waitForMFDIReady(obsidian, obsidian.page);
    const message = `Scope submit ${Date.now()}`;

    await registerAppScopeHotkeyCounter(
      obsidian,
      "submit-parent",
      ["Ctrl"],
      "Enter",
    );

    await setLiveEditorContent(obsidian, message);
    await liveEditor.click();
    await obsidian.page.keyboard.press("Control+Enter");
    await obsidian.page.waitForTimeout(500);

    const matchingPosts = obsidian.page.locator(".list .markdown-rendered", {
      hasText: message,
    });

    await expect(matchingPosts).toHaveCount(1);
    await expect.poll(() => getAppScopeHotkeyCount(obsidian, "submit-parent")).toBe(0);
  });

  test("入力したテキストが投稿される", async ({ obsidian }) => {
    await waitForMFDIReady(obsidian, obsidian.page);
    const message = `E2E post ${Date.now()}`;

    await setLiveEditorContent(obsidian, message);
    await obsidian.page.getByRole("button", { name: "投稿" }).click();
    await obsidian.page.waitForTimeout(500); // 投稿処理が完了するのを待つ

    const content = await obsidian.page.locator(".list .markdown-rendered").first().innerText();

    expect(content).toContain(message);
  });

  test("タブを閉じたあとライブエディタの内容が復元される", async ({ obsidian }) => {
    await waitForMFDIReady(obsidian, obsidian.page);
    const draft = `draft-${Date.now()}`;

    await setLiveEditorContent(obsidian, draft);
    await obsidian.page.waitForTimeout(3000); // ドラフト保存が完了するのを待つ

    await obsidian.closeTab();

    await obsidian.command("mobile-first-daily-interface:mfdi-open-view");
    await obsidian.waitForViewType("mfdi-view");

    const reopenedEditor = obsidian.page.locator(".mfdi-input-area .cm-content");
    await expect(reopenedEditor).toBeVisible({ timeout: 15000 });
    await expect.poll(() => getLiveEditorContent(obsidian)).toBe(draft);
  });
});
