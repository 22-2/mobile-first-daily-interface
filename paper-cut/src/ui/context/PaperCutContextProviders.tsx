import type { ReactNode } from "react";
import { useMemo } from "react";
import { MFDIStorage } from "src/core/storage";
import { DEFAULT_SETTINGS } from "src/settings";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import { AppContext } from "src/ui/context/AppContext";
import { ComponentContextProvider } from "src/ui/context/ComponentContext";
import type { PaperCutView } from "paper-cut/src/ui/view/PaperCutView";

// MFDI の AppContextProvider は内部で新たな ObsidianAppShell(app) を生成するため、
// PaperCutView がすでに持っている shell とは別インスタンスになってしまう。
// またその初期化処理が MFDI のコンテキストツリーに接続されて状態干渉が起きる。
// そのため PaperCut は AppContextProvider を使わず、
// AppContext に prop の shell をそのまま流す独自プロバイダーを用意する。
export function PaperCutContextProviders({
  shell,
  view,
  children,
}: {
  shell: ObsidianAppShell;
  view: PaperCutView;
  children: ReactNode;
}) {
  // MFDIStorage は localStorage の薄いラッパーであり MFDI ストアとは無関係。
  // ObsidianMarkdown などが useAppContext() を呼ぶ際に型を満たすために生成する。
  const storage = useMemo(() => new MFDIStorage(shell.getAppId()), [shell]);

  const appContextValue = useMemo(
    () => ({ shell, storage, settings: DEFAULT_SETTINGS }),
    [shell, storage],
  );

  return (
    <ComponentContextProvider component={view}>
      <AppContext.Provider value={appContextValue}>
        {children}
      </AppContext.Provider>
    </ComponentContextProvider>
  );
}
