import { App, Modal } from "obsidian";

export async function showInputModal(
  app: App,
  args: {
    title: string;
    placeholder?: string;
    defaultValue?: string;
  },
): Promise<string | null> {
  return new InputModal(
    app,
    args.title,
    args.placeholder,
    args.defaultValue,
  ).show();
}

export class InputModal extends Modal {
  private inputEl!: HTMLInputElement;
  private submitted = false;
  private resolvePromise!: (value: string | null) => void;

  constructor(
    app: App,
    private title: string,
    private placeholder?: string,
    private defaultValue?: string,
  ) {
    super(app);
  }

  show(): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen(): void {
    this.submitted = false;
    this.modalEl.addClass("mfdi-input-modal");
    this.contentEl.empty();
    this.titleEl.setText(this.title);

    const bodyEl = this.contentEl.createDiv({ cls: "mfdi-input-modal__body" });

    this.inputEl = bodyEl.createEl("input", { cls: "mfdi-input-modal__input" });
    this.inputEl.type = "text";
    this.inputEl.placeholder = this.placeholder ?? "";
    if (this.defaultValue) this.inputEl.value = this.defaultValue;

    const actionsEl = bodyEl.createDiv({ cls: "mfdi-input-modal__actions" });
    const cancelButtonEl = actionsEl.createEl("button", {
      cls: "mfdi-input-modal__button",
      text: "キャンセル",
      type: "button",
    });
    const submitButtonEl = actionsEl.createEl("button", {
      cls: "mfdi-input-modal__button mod-cta",
      text: "決定",
      type: "button",
    });

    const submit = () => {
      this.submitted = true;
      this.close();
    };

    cancelButtonEl.addEventListener("click", () => this.close());
    submitButtonEl.addEventListener("click", submit);

    this.inputEl.addEventListener("keydown", (ev) => {
      if (ev.isComposing) return;
      if (ev.key === "Enter") {
        ev.preventDefault();
        submit();
      }
    });

    queueMicrotask(() => this.inputEl.focus());
  }

  onClose(): void {
    this.modalEl.removeClass("mfdi-input-modal");
    super.onClose();
    this.resolvePromise?.(this.submitted ? (this.inputEl?.value ?? "") : null);
  }
}
