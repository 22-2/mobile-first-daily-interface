import type { TAbstractFile } from "obsidian";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import { PaperCutContextProviders } from "paper-cut/src/ui/context/PaperCutContextProviders";
import { ViewContent } from "paper-cut/src/ui/components/ViewContent";
import {
  createPaperCutStore,
  type PaperCutStore,
} from "paper-cut/src/ui/store/paperCutStore";
import {
  PaperCutStoreProvider,
  useCurrentPaperCutStore,
} from "paper-cut/src/ui/store/PaperCutStoreContext";
import type { PaperCutView } from "paper-cut/src/ui/view/PaperCutView";

export const ReactView = ({
  shell,
  filePath,
  containerEl,
  view,
}: {
  // app は不要。AppContextProvider を使わないため PaperCutView.shell をそのまま渡す。
  shell: ObsidianAppShell;
  filePath: string | null;
  containerEl?: HTMLElement;
  view: PaperCutView;
}) => {
  // ビューごとに独立したストアを生成する（MFDI の ReactView と同パターン）
  const storeRef = useRef<PaperCutStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createPaperCutStore();
  }

  return (
    <PaperCutContextProviders shell={shell} view={view}>
      <PaperCutStoreProvider store={storeRef.current}>
        <PaperCutAppRoot shell={shell} filePath={filePath} containerEl={containerEl}>
          <ViewContent containerEl={containerEl} />
        </PaperCutAppRoot>
      </PaperCutStoreProvider>
    </PaperCutContextProviders>
  );
};

// 意図: ストアの初期化とファイル監視を、ストアが確実にコンテキストに存在する状態で行うため、
//        ReactView の子コンポーネントとして定義する。
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
