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
  app: App;
  shell: ObsidianAppShell;
  appHelper: AppHelper;
  storage: MFDIStorage;
  settings: Settings;
  view: MFDIView;
}

const AppContext = createContext<AppContextValue | null>(null);

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
    // raw app は Obsidian UI コンポーネント向けに残し、通常の業務ロジックは shell を使う。
    () => ({ app, shell: appHelper, appHelper, storage, settings, view }),
    [app, appHelper, storage, settings, view],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
