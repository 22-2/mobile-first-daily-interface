import type { MFDIView } from "src/ui/view/MFDIView";

export function bindSearchDelegates(
  view: MFDIView,
  actionDelegates: {
    setSearchQuery: (query: string) => void;
    setSearchInputOpen: (open: boolean) => void;
  },
): () => void {
  view.actionDelegates.onSearchQueryChange = (query: string) => {
    actionDelegates.setSearchQuery(query);
  };
  view.actionDelegates.onSearchInputOpen = () => {
    actionDelegates.setSearchInputOpen(true);
  };
  view.actionDelegates.onSearchInputClose = () => {
    actionDelegates.setSearchInputOpen(false);
  };

  return () => {
    view.actionDelegates.onSearchQueryChange = undefined;
    view.actionDelegates.onSearchInputOpen = undefined;
    view.actionDelegates.onSearchInputClose = undefined;
  };
}
