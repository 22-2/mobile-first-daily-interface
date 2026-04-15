import type { App, TAbstractFile } from "obsidian";
import { useEffect, useLayoutEffect, useRef } from "react";
import { AppContextProvider } from "src/ui/context/AppContext";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import { DEFAULT_SETTINGS } from "src/settings";
import { PaperCutViewContent } from "paper-cut/src/ui/components/PaperCutViewContent";
import {
  createPaperCutStore,
  type PaperCutStore,
} from "paper-cut/src/ui/store/paperCutStore";
import {
  PaperCutStoreProvider,
  useCurrentPaperCutStore,
} from "paper-cut/src/ui/store/PaperCutStoreContext";
import { ComponentContextProvider } from "src/ui/context/ComponentContext";
import type { PaperCutView } from "paper-cut/src/ui/view/PaperCutView";

export const PaperCutReactView = ({
  app,
  shell,
  filePath,
  containerEl,
  view,
}: {
  app: App;
  shell: ObsidianAppShell;
  filePath: string | null;
  containerEl?: HTMLElement;
  view: PaperCutView,
}) => {
  // ビューごとに独立したストアを生成する（MFDI の ReactView と同パターン）
  const storeRef = useRef<PaperCutStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createPaperCutStore();
  }

  return (
    <ComponentContextProvider component={view}>
    <AppContextProvider app={app} settings={DEFAULT_SETTINGS}>
      <PaperCutStoreProvider store={storeRef.current}>
        <PaperCutAppRoot shell={shell} filePath={filePath} containerEl={containerEl}>
          <PaperCutViewContent containerEl={containerEl} />
        </PaperCutAppRoot>
      </PaperCutStoreProvider>
    </AppContextProvider>
    </ComponentContextProvider>
  );
};

// 意図: ストアの初期化とファイル監視を、ストアが確実にコンテキストに存在する状態で行うため、
//        PaperCutReactView の子コンポーネントとして定義する。
const PaperCutAppRoot = ({
  shell,
  filePath,
  containerEl: _containerEl,
  children,
}: {
  shell: ObsidianAppShell;
  filePath: string | null;
  containerEl?: HTMLElement;
  children: React.ReactNode;
}) => {
  const store = useCurrentPaperCutStore();

  // 初回マウント時および filePath 変更時にストアを初期化する
  useLayoutEffect(() => {
    if (!filePath) return;
    void store.getState().initialize(shell, filePath);
  }, [shell, filePath, store]);

  // vault の変更イベントを監視し、対象ファイルが更新されたらポストをリロードする
  useEffect(() => {
    if (!filePath) return;
    const vault = shell.getVault();

    const handler = (file: TAbstractFile) => {
      if (file?.path === filePath) {
        void store.getState().loadPosts();
      }
    };

    vault.on("modify", handler);
    return () => {
      // @ts-expect-error vault.off の型定義が緩いため
      vault.off("modify", handler);
    };
  }, [shell, filePath, store]);

  return <>{children}</>;
};
