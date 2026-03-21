import { App, Modal } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { DraftListManager } from "src/ui/components/DraftListManager";
import { AppStoreApi, AppStoreProvider } from "src/ui/store/appStore";

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
      <AppStoreProvider store={this.store}>
        <DraftListManager onClose={() => this.close()} />
      </AppStoreProvider>
    );
  }

  onClose() {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
