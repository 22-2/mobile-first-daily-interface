import { TFile } from "obsidian";
import {
  createBuiltinRegistry,
  createCommandContribution,
  createFixedNoteRegistryContribution,
  createRibbonContribution,
  createTagIndexLifecycleContribution,
  createViewRegistrationContribution,
} from "src/core/builtin-registry";
import { describe, expect, it, vi } from "vitest";

const VIEW_TYPE_MFDI = "mfdi-view";

describe("builtin registry", () => {
  it("activates contributions in registration order", () => {
    const calls: string[] = [];
    const context = { marker: "ctx" } as any;
    const registry = createBuiltinRegistry([
      {
        id: "first",
        activate: (receivedContext) => {
          expect(receivedContext).toBe(context);
          calls.push("first");
        },
      },
      {
        id: "second",
        activate: () => {
          calls.push("second");
        },
      },
    ]);

    registry.activate(context);

    expect(calls).toEqual(["first", "second"]);
  });

  it("registers the MFDI view through the contribution", () => {
    const registerView = vi.fn();
    const createMFDIView = vi.fn((leaf) => ({ leaf }) as any);

    createViewRegistrationContribution().activate({
      registerView,
      createMFDIView,
    } as any);

    expect(registerView).toHaveBeenCalledTimes(1);
    const [viewType, creator] = registerView.mock.calls[0];
    expect(viewType).toBe(VIEW_TYPE_MFDI);

    const leaf = { id: "leaf" } as any;
    expect(creator(leaf)).toEqual({ leaf });
    expect(createMFDIView).toHaveBeenCalledWith(leaf);
  });

  it("registers ribbon and commands through built-in contributions", async () => {
    const addRibbonIcon = vi.fn();
    const addCommand = vi.fn((command) => command);
    const attachMFDIView = vi.fn(async () => ({ id: "leaf" }) as any);
    const revealLeaf = vi.fn();
    const createAndOpenFixedNote = vi.fn(async () => {});

    const context = {
      addRibbonIcon,
      addCommand,
      attachMFDIView,
      createAndOpenFixedNote,
      app: { workspace: { revealLeaf } },
    } as any;

    createRibbonContribution().activate(context);
    createCommandContribution().activate(context);

    expect(addRibbonIcon).toHaveBeenCalledWith(
      "pencil",
      "Mobile First Daily Interface",
      expect.any(Function),
    );
    expect(addCommand).toHaveBeenCalledTimes(2);

    const ribbonCallback = addRibbonIcon.mock.calls[0][2];
    ribbonCallback();
    expect(attachMFDIView).toHaveBeenCalledWith({});

    const openViewCommand = addCommand.mock.calls[0][0];
    await openViewCommand.callback();
    expect(revealLeaf).toHaveBeenCalledWith({ id: "leaf" });

    const fixedNoteCommand = addCommand.mock.calls[1][0];
    await fixedNoteCommand.callback();
    expect(createAndOpenFixedNote).toHaveBeenCalledTimes(1);
  });

  it("tag index lifecycle contribution wires layout-ready and vault events", async () => {
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
    const storage = { get: vi.fn(() => null), set: vi.fn() } as any;

    createTagIndexLifecycleContribution(tagIndexExtension, storage).activate({
      app,
      shell: {} as any,
      getSettings: () => settings,
      saveSettings: vi.fn(async () => {}),
      register: vi.fn(),
      registerEvent: vi.fn(),
      registerView: vi.fn(),
      addRibbonIcon: vi.fn(),
      addCommand: vi.fn(),
      createMFDIView: vi.fn(),
      createAndOpenFixedNote: vi.fn(async () => {}),
      attachMFDIView: vi.fn(async () => undefined),
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

  it("fixed note registry contribution keeps settings in sync on rename and delete", async () => {
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

    createFixedNoteRegistryContribution().activate({
      app,
      shell: {} as any,
      getSettings: () => settings,
      saveSettings,
      register: vi.fn(),
      registerEvent: vi.fn(),
      registerView: vi.fn(),
      addRibbonIcon: vi.fn(),
      addCommand: vi.fn(),
      createMFDIView: vi.fn(),
      createAndOpenFixedNote: vi.fn(async () => {}),
      attachMFDIView: vi.fn(async () => undefined),
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
