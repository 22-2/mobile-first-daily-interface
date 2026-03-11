export const normalizePath = (p: string) => p;
export class TFile {
  basename: string;
  extension: string;
  path: string;
}
export class TFolder {}
export const Vault = {
  recurseChildren: (folder: any, callback: any) => {},
};

export class App {}
export class PluginSettingTab {
  constructor(public app: any, public plugin: any) {}
}
export class Setting {
  constructor(public containerEl: HTMLElement) {}
  setName() { return this; }
  setDesc() { return this; }
  addText() { return this; }
  addToggle() { return this; }
  addDropdown() { return this; }
}
export class Menu {
  addItem() { return this; }
  addSeparator() { return this; }
  showAtMouseEvent() { return this; }
}
export class Notice {
  constructor(message: string) {}
}
export const setIcon = () => {};
