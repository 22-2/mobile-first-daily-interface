import path from "node:path";
import type { Page } from "@playwright/test";
import type { ObsidianAPI } from "obsidian-e2e-toolkit";
import { expect, test } from "obsidian-e2e-toolkit";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGIN_PATH = path.join(__dirname, "../dist");
const HOST_FILE_PATH = "mfdi-e2e-fixed-restore-host.md";
const FIXED_NOTE_PATH = "MFDI/RestoreTarget.mfdi.md";

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

async function waitForPluginReady(obsidian: ObsidianAPI, page: Page) {
  await obsidian.waitReady();
  await obsidian.waitForPluginEnabled("mobile-first-daily-interface");

  await obsidian.save(HOST_FILE_PATH, "");
  await obsidian.open(HOST_FILE_PATH);
  await obsidian.waitReady();

  await expect(page.locator(".workspace-tabs.mod-active").first()).toBeVisible({
    timeout: 15000,
  });
}

async function ensureFixedNoteFixture(obsidian: ObsidianAPI) {
  await obsidian.page.evaluate(async () => {
    if (!app.vault.getAbstractFileByPath("MFDI")) {
      await app.vault.createFolder("MFDI");
    }
  });

  await obsidian.save(
    FIXED_NOTE_PATH,
    [
      "## Thino session 1",
      "- 09:00:00 session-one [mfdiId::session-1]",
      "",
      "## Thino session 2",
      "- 10:00:00 session-two [mfdiId::session-2]",
      "",
    ].join("\n"),
  );
}

async function openFixedNoteView(obsidian: ObsidianAPI, sessionNumber: number) {
  await obsidian.page.evaluate(
    async ({ path, sessionNumber }) => {
      const leaf = app.workspace.getLeaf(true);
      await leaf.setViewState({
        type: "mfdi-view",
        active: true,
        state: {
          displayMode: "focus",
          granularity: "day",
          asTask: false,
          threadOnly: false,
          fixedSessionNumber: sessionNumber,
          timeFilter: "all",
          dateFilter: "all",
          searchQuery: "",
          activeTopic: "",
          noteMode: "fixed",
          file: path,
        },
      });
      app.workspace.revealLeaf(leaf);
    },
    { path: FIXED_NOTE_PATH, sessionNumber },
  );

  await obsidian.waitForViewType("mfdi-view");
  await expect(obsidian.page.locator(".mfdi-input-area .cm-content")).toBeVisible({
    timeout: 15000,
  });
}

async function reopenCurrentMFDILeaf(obsidian: ObsidianAPI) {
  await obsidian.page.evaluate(async () => {
    const currentLeaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!currentLeaf) {
      throw new Error("mfdi-view leaf not found");
    }

    const currentState = currentLeaf.view.getState();
    currentLeaf.detach();

    const nextLeaf = app.workspace.getLeaf(true);
    await nextLeaf.setViewState({
      type: "mfdi-view",
      active: true,
      state: currentState,
    });
    app.workspace.revealLeaf(nextLeaf);
  });
}

async function reloadObsidianWindow(obsidian: ObsidianAPI) {
  await obsidian.page.evaluate(() => {
    const workspace = app.workspace as {
      requestSaveLayout?: () => void;
    };
    workspace.requestSaveLayout?.();
  });

  await obsidian.page.reload();
  await obsidian.waitReady();
  await obsidian.waitForPluginEnabled("mobile-first-daily-interface");
}

async function getFixedSessionSnapshot(obsidian: ObsidianAPI) {
  return obsidian.page.evaluate(() => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!leaf) {
      throw new Error("mfdi-view leaf not found");
    }

    const state = leaf.view.getState() as {
      fixedSessionNumber?: number;
      noteMode?: string;
      file?: string | null;
    };
    const listText = document.querySelector(".list")?.textContent ?? "";

    return {
      fixedSessionNumber: state.fixedSessionNumber ?? null,
      noteMode: state.noteMode ?? null,
      file: state.file ?? null,
      listText,
    };
  });
}

test.describe("fixed note restore", () => {
  test("restored fixed leaf keeps session selection and stays responsive", async ({
    obsidian,
  }) => {
    await waitForPluginReady(obsidian, obsidian.page);
    await ensureFixedNoteFixture(obsidian);
    await openFixedNoteView(obsidian, 2);

    await expect.poll(async () => {
      return (await getFixedSessionSnapshot(obsidian)).fixedSessionNumber;
    }).toBe(2);

    await expect.poll(async () => {
      return (await getFixedSessionSnapshot(obsidian)).listText;
    }).toContain("session-two");

    await reopenCurrentMFDILeaf(obsidian);

    await expect(obsidian.page.locator(".mfdi-input-area .cm-content")).toBeVisible({
      timeout: 15000,
    });
    await expect.poll(async () => {
      return await getFixedSessionSnapshot(obsidian);
    }).toMatchObject({
      fixedSessionNumber: 2,
      noteMode: "fixed",
      file: FIXED_NOTE_PATH,
    });

    await expect.poll(async () => {
      return (await getFixedSessionSnapshot(obsidian)).listText;
    }).toContain("session-two");
  });

  test("reloading the window keeps the restored fixed session responsive", async ({
    obsidian,
  }) => {
    await waitForPluginReady(obsidian, obsidian.page);
    await ensureFixedNoteFixture(obsidian);
    await openFixedNoteView(obsidian, 2);

    await expect.poll(async () => {
      return (await getFixedSessionSnapshot(obsidian)).fixedSessionNumber;
    }).toBe(2);

    await obsidian.page.waitForTimeout(500); // wait for layout save to complete
    await reloadObsidianWindow(obsidian);

    await expect(obsidian.page.locator(".mfdi-input-area .cm-content")).toBeVisible({
      timeout: 15000,
    });
    await expect.poll(async () => {
      return await getFixedSessionSnapshot(obsidian);
    }).toMatchObject({
      fixedSessionNumber: 2,
      noteMode: "fixed",
      file: FIXED_NOTE_PATH,
    });

    await expect.poll(async () => {
      return (await getFixedSessionSnapshot(obsidian)).listText;
    }).toContain("session-two");
  });
});
