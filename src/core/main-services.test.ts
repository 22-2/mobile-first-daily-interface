import { TFile } from "obsidian";
import {
  createFixedNoteRegistryService,
  createTagIndexLifecycleService,
} from "src/core/main-services";
import { describe, expect, it, vi } from "vitest";

describe("main services", () => {
  it("tag index lifecycle service wires layout-ready and vault events", async () => {
    let onLayoutReadyCallback: (() => void) | undefined;
    let changedCallback: ((file: TFile) => void) | undefined;
    let renameCallback:
      | ((file: TFile | null, oldPath: string) => void)
      | undefined;
    let deleteCallback: ((file: TFile | null) => void) | undefined;

    const app = {
      workspace: {
        onLayoutReady: (callback: () => void) => {
          onLayoutReadyCallback = callback;
        },
      },
      metadataCache: {
        on: (_event: string, callback: (file: TFile) => void) => {
          changedCallback = callback;
          return {} as any;
        },
      },
      vault: {
        on: (event: string, callback: (...args: any[]) => void) => {
          if (event === "rename") renameCallback = callback as any;
          if (event === "delete") deleteCallback = callback as any;
          return {} as any;
        },
      },
    } as any;

    const tagIndexExtension = {
      fullScan: vi.fn(async () => {}),
      handleFileChanged: vi.fn(async () => {}),
      handleFileRenamed: vi.fn(async () => {}),
      handleFileDeleted: vi.fn(async () => {}),
      dispose: vi.fn(async () => {}),
    };
    const settings = { fixedNoteFiles: [] } as any;

    createTagIndexLifecycleService().activate({
      app,
      appHelper: {} as any,
      getSettings: () => settings,
      saveSettings: vi.fn(async () => {}),
      register: vi.fn(),
      registerEvent: vi.fn(),
      attachMFDIView: vi.fn(async () => undefined),
      fixedNoteViewExtension: {} as any,
      tagIndexExtension,
    });

    onLayoutReadyCallback?.();
    const file = Object.assign(new TFile(), {
      path: "daily/2026-03-15.md",
      basename: "2026-03-15",
      extension: "md",
    });
    changedCallback?.(file);
    renameCallback?.(file, "old.md");
    deleteCallback?.(file);

    expect(tagIndexExtension.fullScan).toHaveBeenCalledTimes(1);
    expect(tagIndexExtension.handleFileChanged).toHaveBeenCalledWith(
      {},
      file,
      settings,
    );
    expect(tagIndexExtension.handleFileRenamed).toHaveBeenCalledWith(
      {},
      file,
      "old.md",
      settings,
    );
    expect(tagIndexExtension.handleFileDeleted).toHaveBeenCalledWith(file.path);
  });

  it("fixed note registry service keeps settings in sync on rename and delete", async () => {
    let renameCallback:
      | ((file: TFile | null, oldPath: string) => void)
      | undefined;
    let deleteCallback: ((file: TFile | null) => void) | undefined;

    const app = {
      vault: {
        on: (event: string, callback: (...args: any[]) => void) => {
          if (event === "rename") renameCallback = callback as any;
          if (event === "delete") deleteCallback = callback as any;
          return {} as any;
        },
      },
    } as any;

    const settings = {
      fixedNoteFiles: [{ path: "old.md" }, { path: "keep.md" }],
    } as any;
    const saveSettings = vi.fn(async () => {});

    createFixedNoteRegistryService().activate({
      app,
      appHelper: {} as any,
      getSettings: () => settings,
      saveSettings,
      register: vi.fn(),
      registerEvent: vi.fn(),
      attachMFDIView: vi.fn(async () => undefined),
      fixedNoteViewExtension: {} as any,
      tagIndexExtension: {} as any,
    });

    const renamedFile = Object.assign(new TFile(), {
      path: "new.md",
      basename: "new",
      extension: "md",
    });
    renameCallback?.(renamedFile, "old.md");
    expect(settings.fixedNoteFiles).toEqual([
      { path: "new.md" },
      { path: "keep.md" },
    ]);

    deleteCallback?.(renamedFile);
    expect(settings.fixedNoteFiles).toEqual([{ path: "keep.md" }]);
    expect(saveSettings).toHaveBeenCalledTimes(2);
  });
});
