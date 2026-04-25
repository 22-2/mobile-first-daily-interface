import type { MFDIView } from "src/ui/view/MFDIView";

export function bindSearchDelegates(
  view: MFDIView,
  handlers: {
    setSearchQuery: (query: string) => void;
    setSearchInputOpen: (open: boolean) => void;
  },
): () => void {
  view.actionDelegates.onSearchQueryChange = (query: string) => {
    handlers.setSearchQuery(query);
  };
  view.actionDelegates.onSearchInputOpen = () => {
    handlers.setSearchInputOpen(true);
  };
  view.actionDelegates.onSearchInputClose = () => {
    handlers.setSearchInputOpen(false);
  };

  return () => {
    view.actionDelegates.onSearchQueryChange = undefined;
    view.actionDelegates.onSearchInputOpen = undefined;
    view.actionDelegates.onSearchInputClose = undefined;
  };
}
