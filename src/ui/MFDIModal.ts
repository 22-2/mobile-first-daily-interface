import { App, Scope } from "obsidian";
import { ModalEditor } from "obsidian-magical-editor";

export interface MFDIModalOptions {
  initialContent: string;
  onChange: (content: string) => void;
  onClose: (content: string) => void;
}

export class MFDIModal extends ModalEditor {
  constructor(app: App, options: MFDIModalOptions) {
    super(app, {
      initialContent: options.initialContent,
      onChange: options.onChange,
      onClose: options.onClose,
    });

    this.scope = new Scope(this.app.scope as Scope);
    const close = () => {
      this.close();
      return true;
    };
    // Ctrl+Shift+Alt+O で閉じる（thino-extension と同様）
    this.scope.register(["Ctrl", "Shift", "Alt"], "o", close);
    this.scope.register([], "Escape", close);
  }

  onClose() {
    super.onClose();
  }
}
