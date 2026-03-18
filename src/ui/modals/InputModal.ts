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
    this.titleEl.setText(this.title);

    this.inputEl = this.contentEl.createEl("input");
    this.inputEl.type = "text";
    this.inputEl.placeholder = this.placeholder ?? "";
    if (this.defaultValue) this.inputEl.value = this.defaultValue;

    this.inputEl.addEventListener("keydown", (ev) => {
      if (ev.isComposing) return;
      if (ev.key === "Enter") {
        ev.preventDefault();
        this.submitted = true;
        this.close();
      }
    });

    queueMicrotask(() => this.inputEl.focus());
  }

  onClose(): void {
    super.onClose();
    this.resolvePromise?.(this.submitted ? (this.inputEl?.value ?? "") : null);
  }
}
