import type { App } from "obsidian";
import { MFDIBaseModal } from "src/ui/modals/MFDIBaseModal";

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

class InputModal extends MFDIBaseModal<string | null> {
  private inputEl!: HTMLInputElement;
  private submitted = false;

  constructor(
    app: App,
    titleText: string,
    private placeholder?: string,
    private defaultValue?: string,
  ) {
    super(app, titleText);
  }

  renderBody(bodyEl: HTMLElement): void {
    this.submitted = false;
    this.inputEl = bodyEl.createEl("input", { cls: "mfdi-modal__input" });
    this.inputEl.type = "text";
    this.inputEl.placeholder = this.placeholder ?? "";
    if (this.defaultValue) this.inputEl.value = this.defaultValue;

    const actionsEl = this.createActions(bodyEl);
    this.createButton(actionsEl, "キャンセル", () => this.close());
    this.createButton(actionsEl, "決定", () => this.submit(), { cta: true });

    this.inputEl.addEventListener("keydown", (ev) => {
      if (ev.isComposing) return;
      if (ev.key === "Enter") {
        ev.preventDefault();
        this.submit();
      }
    });

    queueMicrotask(() => this.inputEl.focus());
  }

  private submit() {
    this.submitted = true;
    this.close();
  }

  onClose(): void {
    super.onClose();
    this.resolvePromise?.(this.submitted ? (this.inputEl?.value ?? "") : null);
  }
}
