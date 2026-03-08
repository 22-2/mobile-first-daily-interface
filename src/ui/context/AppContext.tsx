import { App } from "obsidian";
import * as React from "react";
import { createContext, ReactNode, useContext, useMemo } from "react";
import { AppHelper } from "../../app-helper";
import { Settings } from "../../settings";
import { MFDIStorage } from "../../utils/storage";
import { MFDIView } from "../MFDIView";

// ─────────────────────────────────────────────────────────────────
// Context value type
// ─────────────────────────────────────────────────────────────────

export interface AppContextValue {
  app: App;
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
    () => ({ app, appHelper, storage, settings, view }),
    [app, appHelper, storage, settings, view],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
