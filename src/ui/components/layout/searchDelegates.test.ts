import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindSearchDelegates } from "src/ui/components/layout/searchDelegates";

describe("bindSearchDelegates", () => {
  let setSearchQuery: ReturnType<typeof vi.fn>;
  let setSearchInputOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setSearchQuery = vi.fn();
    setSearchInputOpen = vi.fn();
  });

  it("search input events and query changes are forwarded", () => {
    const view = {
      actionDelegates: {},
    } as Parameters<typeof bindSearchDelegates>[0];

    const cleanup = bindSearchDelegates(view, {
      setSearchQuery,
      setSearchInputOpen,
    });

    view.actionDelegates.onSearchQueryChange?.("wanted");
    view.actionDelegates.onSearchInputOpen?.();
    view.actionDelegates.onSearchInputClose?.();

    expect(setSearchQuery).toHaveBeenCalledWith("wanted");
    expect(setSearchInputOpen).toHaveBeenNthCalledWith(1, true);
    expect(setSearchInputOpen).toHaveBeenNthCalledWith(2, false);

    cleanup();
    expect(view.actionDelegates.onSearchQueryChange).toBeUndefined();
    expect(view.actionDelegates.onSearchInputOpen).toBeUndefined();
    expect(view.actionDelegates.onSearchInputClose).toBeUndefined();
  });
});
