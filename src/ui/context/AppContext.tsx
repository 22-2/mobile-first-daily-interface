import { App } from "obsidian";
import { createContext, ReactNode, useContext, useMemo } from "react";
import { AppHelper } from "src/app-helper";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { Settings } from "src/settings";
import { MFDIView } from "src/ui/view/MFDIView";
import { MFDIStorage } from "src/utils/storage";

// ─────────────────────────────────────────────────────────────────
// Context value type
// ─────────────────────────────────────────────────────────────────

export interface AppContextValue {
  shell: ObsidianAppShell;
  appHelper: AppHelper;
  storage: MFDIStorage;
  settings: Settings;
  view: MFDIView;
}

const AppContext = createContext<AppContextValue | null>(null);
const ObsidianAppContext = createContext<App | null>(null);

// ─────────────────────────────────────────────────────────────────
// Consumer hook
// ─────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────

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
  const appHelper = useMemo(() => new AppHelper(app), [app]);
  const storage = useMemo(
    () => new MFDIStorage(appHelper.getAppId()),
    [appHelper],
  );
  const value = useMemo<AppContextValue>(
    // 一般ロジックから raw app を見えなくして、依存の漏れを型で止める。
    () => ({ shell: appHelper, appHelper, storage, settings, view }),
    [appHelper, storage, settings, view],
  );
  return (
    <ObsidianAppContext.Provider value={app}>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </ObsidianAppContext.Provider>
  );
};
