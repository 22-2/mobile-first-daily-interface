import { App, Modal } from "obsidian";

export class DeleteConfirmModal extends Modal {
  onConfirm: () => Promise<void>;

  constructor(app: App, onConfirm: () => Promise<void>) {
    super(app);
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "削除確認" });
    contentEl.createEl("p", { text: "この投稿を削除しますか？" });

    const buttonContainer = contentEl.createDiv();
    buttonContainer.setCssStyles({
      display: "flex",
      gap: "10px",
      marginTop: "20px",
      justifyContent: "flex-end",
    });

    buttonContainer
      .createEl("button", { text: "キャンセル" })
      .addEventListener("click", () => {
        this.close();
      });

    const deleteButton = buttonContainer.createEl("button", { text: "削除" });
    deleteButton.setCssStyles({
      color: "var(--text-error)",
    });
    deleteButton.addEventListener("click", async () => {
      await this.onConfirm();
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
