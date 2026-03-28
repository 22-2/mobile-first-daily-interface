import type { App } from "obsidian";
import { Modal } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { DraftListManager } from "src/ui/components/DraftListManager";
import type { AppStoreApi } from "src/ui/store/appStore";
import { AppStoreProvider } from "src/ui/store/appStore";
import { AppContextProvider } from "src/ui/context/AppContext";
import { createDefaultMFDIViewState } from "src/ui/view/state";

export class DraftListModal extends Modal {
  private root: Root | null = null;
  private store: AppStoreApi;

  constructor(app: App, store: AppStoreApi) {
    super(app);
    this.store = store;
    this.modalEl.addClass("mfdi-draft-list-modal");
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.root = createRoot(contentEl);
    this.root.render(
      <AppContextProvider
        app={this.app}
        settings={this.store.getState().pluginSettings!}
        // provide a minimal view shim so components expecting a view can call `getState()`
        // FIXME: this is a bit hacky, but it allows us to reuse components that expect a view without needing to refactor them to be view-agnostic. Ideally, we'd refactor those components to not rely on a view at all, but that would be a larger undertaking.
        view={{ getState: () => createDefaultMFDIViewState() } as any}
      >
        <AppStoreProvider store={this.store}>
          <DraftListManager onClose={() => this.close()} />
        </AppStoreProvider>
      </AppContextProvider>,
    );
  }

  onClose() {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
