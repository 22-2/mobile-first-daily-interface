import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { PaperCutState, PaperCutStore } from "paper-cut/src/ui/store/paperCutStore";

const PaperCutStoreContext = createContext<PaperCutStore | null>(null);

export function PaperCutStoreProvider({
  store,
  children,
}: {
  store: PaperCutStore;
  children: React.ReactNode;
}) {
  return (
    <PaperCutStoreContext.Provider value={store}>
      {children}
    </PaperCutStoreContext.Provider>
  );
}

export function useCurrentPaperCutStore(): PaperCutStore {
  const store = useContext(PaperCutStoreContext);
  if (!store) {
    throw new Error(
      "useCurrentPaperCutStore must be used within PaperCutStoreProvider",
    );
  }
  return store;
}

export function usePaperCutStore<T>(selector: (state: PaperCutState) => T): T {
  const store = useCurrentPaperCutStore();
  return useStore(store, selector);
}
