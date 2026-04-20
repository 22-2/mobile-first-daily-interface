import type { WorkspaceLeaf } from "obsidian";
import {
  createFixedNoteViewExtension,
  findExistingMFDILeaf,
} from "src/extensions/fixed-note-view-extension";
import { describe, expect, it, vi } from "vitest";

describe("fixed note view extension", () => {
  it("converts fixed-note markdown state into an MFDI view state", () => {
    const extension = createFixedNoteViewExtension();

    const result = extension.convertMarkdownViewState({
      type: "markdown",
      state: { file: "MFDI/Inbox.mfdi.md" },
    });

    expect(result.type).toBe("mfdi-view");
    expect(result.state.noteMode).toBe("fixed");
    expect(result.state.file).toBe("MFDI/Inbox.mfdi.md");
  });

  it("keeps forced markdown opens untouched", () => {
    const extension = createFixedNoteViewExtension();
    const state = {
      type: "markdown",
      state: {
        file: "MFDI/Inbox.mfdi.md",
        __mfdi_force_markdown: true,
      },
    };

    expect(extension.convertMarkdownViewState(state)).toBe(state);
  });

  it("finds an existing fixed leaf by fixed path", () => {
    const leaf = {
      view: {
        getState: () =>
          ({ noteMode: "fixed", file: "MFDI/Inbox.mfdi.md" }) as any,
      },
    } as WorkspaceLeaf;

    const result = findExistingMFDILeaf([leaf], {
      noteMode: "fixed",
      file: "MFDI/Inbox.mfdi.md",
    });

    expect(result).toBe(leaf);
  });

  it("replaces already-open fixed markdown leaves via attach callback", async () => {
    const extension = createFixedNoteViewExtension();
    const attachMFDIView = vi.fn(async () => undefined);
    const leaves = [
      {
        view: {
          file: { path: "MFDI/Inbox.mfdi.md" },
          getState: () =>
            ({ noteMode: "periodic", file: null }) as any,
        },
      } as any,
    ];

    await extension.replaceOpenFixedMarkdownLeaves({ leaves, attachMFDIView });

    expect(attachMFDIView).toHaveBeenCalledWith(
      expect.objectContaining({
        noteMode: "fixed",
        file: "MFDI/Inbox.mfdi.md",
      }),
      leaves[0],
    );
  });
});
