import { type ItemView } from "obsidian";
import type Plugin from "../../main";

// TitleUrlEditorが操作するビューが持つべきメソッドを定義するインターフェース
export interface EditableItemView extends ItemView {
  getDisplayText(): string;
}

interface EditableTitleBarOptions {
  onSubmitTitle: (newTitle: string) => Promise<void>;
  getTitle: () => string;
}

export class EditableTitleBar {
  private view: EditableItemView;
  private titleEl: HTMLElement;
  private titleContainerEl: HTMLElement;

  constructor(
    view: EditableItemView,
    private options: EditableTitleBarOptions,
  ) {
    this.view = view;
    this.titleEl = view.titleEl;
    this.titleContainerEl = view.titleContainerEl;
  }

  public render() {
    if (
      !(this.titleEl instanceof HTMLElement) ||
      !(this.titleContainerEl instanceof HTMLElement)
    ) {
      return;
    }

    this.titleEl.setAttribute("contenteditable", "true");
    this.titleEl.setCssStyles({
      cursor: "text",
      outline: "none",
      userSelect: "text",
    });
    this.titleEl.setText(this.options.getTitle());

    this.view.registerDomEvent(this.titleContainerEl, "click", (evt) => {
      if (evt.target !== this.titleEl) {
        this.titleEl.focus();
      }
    });

    this.view.registerDomEvent(
      this.titleEl,
      "focus",
      this.handleFocus.bind(this),
    );
    this.view.registerDomEvent(
      this.titleEl,
      "keydown",
      this.handleKeyDown.bind(this),
    );
    this.view.registerDomEvent(this.titleEl, "blur", this.onBlur.bind(this));
  }

  public focus() {
    this.titleEl.focus();
  }

  public setText(text: string) {
    this.titleEl.innerText = text;
  }

  private handleFocus(evt: FocusEvent) {
    const target = evt.target as HTMLElement;
    window.setTimeout(() => {
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
    }, 0);
  }

  private async handleKeyDown(evt: KeyboardEvent) {
    if (evt.key === "Enter") {
      evt.preventDefault();
      await this.options.onSubmitTitle(this.titleEl.innerText.trim());
      this.titleEl.blur();
    }
  }

  private onBlur() {
    this.setText(this.options.getTitle());
  }
}
