import { App } from "obsidian";
import { createContext, ReactNode, useContext, useMemo } from "react";
import { Settings } from "src/settings";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { MFDIView } from "src/ui/view/MFDIView";
import { MFDIStorage } from "src/core/storage";

interface AppContextValue {
  shell: ObsidianAppShell;
  storage: MFDIStorage;
  settings: Settings;
  view: MFDIView;
}

const AppContext = createContext<AppContextValue | null>(null);
const ObsidianAppContext = createContext<App | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within AppContextProvider");
  }
  return ctx;
}

export function useObsidianApp(): App {
  const app = useContext(ObsidianAppContext);
  if (!app) {
    throw new Error("useObsidianApp must be used within AppContextProvider");
  }
  return app;
}

interface AppContextProviderProps {
  app: App;
  settings: Settings;
  view: MFDIView;
  children: ReactNode;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({
  app,
  settings,
  view,
  children,
}) => {
  const shell = useMemo(() => new ObsidianAppShell(app), [app]);
  const storage = useMemo(() => new MFDIStorage(shell.getAppId()), [shell]);
  const value = useMemo<AppContextValue>(
    // 一般ロジックから raw app を見えなくして、依存の漏れを型で止める。
    () => ({ shell, storage, settings, view }),
    [shell, storage, settings, view],
  );

  return (
    <ObsidianAppContext.Provider value={app}>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </ObsidianAppContext.Provider>
  );
};
