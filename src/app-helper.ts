import { App } from "obsidian";
import { ObsidianAppShell, Task } from "src/shell/obsidian-shell";

export class AppHelper extends ObsidianAppShell {
  constructor(app: App) {
    super(app);
  }

  getApp(): App {
    return this.getRawApp();
  }
}

export type { Task };
