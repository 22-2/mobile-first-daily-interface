import { render } from "@testing-library/react";
import { ObsidianLiveEditor } from "src/ui/components/editor/ObsidianLiveEditor";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockEditorApi = {
  focus: ReturnType<typeof vi.fn>;
  getContent: ReturnType<typeof vi.fn>;
  getContentSnapshot: ReturnType<typeof vi.fn>;
  subscribeContent: ReturnType<typeof vi.fn>;
  setContent: ReturnType<typeof vi.fn>;
  setReadOnly: ReturnType<typeof vi.fn>;
  setPlaceholder: ReturnType<typeof vi.fn>;
};

const editorState = vi.hoisted(() => ({
  api: null as MockEditorApi | null,
}));

vi.mock("@22-2/obsidian-magical-editor", () => ({}));

vi.mock("src/ui/components/editor/hooks", () => ({
  useFakeEditor: vi.fn(() => ({ current: editorState.api })),
}));

function createMockEditor(snapshot = ""): MockEditorApi {
  let currentSnapshot = snapshot;

  return {
    focus: vi.fn(),
    getContent: vi.fn(() => currentSnapshot),
    getContentSnapshot: vi.fn(() => currentSnapshot),
    subscribeContent: vi.fn(() => () => {}),
    setContent: vi.fn((text: string) => {
      currentSnapshot = text;
    }),
    setReadOnly: vi.fn(),
    setPlaceholder: vi.fn(),
  };
}

describe("ObsidianLiveEditor", () => {
  beforeEach(() => {
    editorState.api = createMockEditor("");
  });

  afterEach(() => {
    editorState.api = null;
  });

  it("mount 後に initialValue が更新されたら editor へ同期する", () => {
    const view = render(
      <ObsidianLiveEditor
        ref={null}
        leaf={{} as never}
        app={{} as never}
        initialValue=""
        onChange={vi.fn()}
      />,
    );

    expect(editorState.api?.setContent).not.toHaveBeenCalled();

    view.rerender(
      <ObsidianLiveEditor
        ref={null}
        leaf={{} as never}
        app={{} as never}
        initialValue="restored draft"
        onChange={vi.fn()}
      />,
    );

    expect(editorState.api?.setContent).toHaveBeenCalledWith("restored draft");
  });

  it("editor snapshot と同じ initialValue なら再同期しない", () => {
    editorState.api = createMockEditor("already-synced");

    render(
      <ObsidianLiveEditor
        ref={null}
        leaf={{} as never}
        app={{} as never}
        initialValue="already-synced"
        onChange={vi.fn()}
      />,
    );

    expect(editorState.api?.setContent).not.toHaveBeenCalled();
  });
});
