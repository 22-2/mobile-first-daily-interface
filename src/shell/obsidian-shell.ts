import { App, Editor, MarkdownView, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { Commands } from "obsidian-typings";

interface UnsafeAppInterface {
  appId: string;
  commands: Commands;
  plugins?: {
    getPlugin(id: string): unknown;
  };
  internalPlugins?: {
    getPluginById(id: string): unknown;
  };
}

export class ObsidianAppShell {
  // Obsidian 依存をここに集約して、下位層へ生の App を漏らしにくくする。
  protected unsafeApp: App & UnsafeAppInterface;

  constructor(app: App) {
    this.unsafeApp = app as App & UnsafeAppInterface;
  }

  getRawApp(): App {
    return this.unsafeApp;
  }

  getAppId(): string {
    return this.unsafeApp.appId;
  }

  getVault() {
    return this.unsafeApp.vault;
  }

  getWorkspace() {
    return this.unsafeApp.workspace;
  }

  getMetadataCache() {
    return this.unsafeApp.metadataCache;
  }

  getFileManager() {
    return this.unsafeApp.fileManager;
  }

  getCommunityPlugin<T = unknown>(id: string): T | undefined {
    return this.unsafeApp.plugins?.getPlugin(id) as T | undefined;
  }

  getInternalPluginById<T = unknown>(id: string): T | undefined {
    return this.unsafeApp.internalPlugins?.getPluginById(id) as T | undefined;
  }

  getAbstractFileByPath(path: string): TAbstractFile | null {
    return this.unsafeApp.vault.getAbstractFileByPath(path);
  }

  getRootFolder() {
    return this.unsafeApp.vault.getRoot();
  }

  async readFile(path: string): Promise<string> {
    return this.unsafeApp.vault.adapter.read(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.unsafeApp.vault.adapter.write(path, content);
  }

  appendFile(path: string, text: string) {
    return this.unsafeApp.vault.adapter.append(path, text);
  }

  async cachedReadFile(file: TFile): Promise<string> {
    return this.unsafeApp.vault.cachedRead(file);
  }

  async readVaultFile(file: TFile): Promise<string> {
    return this.unsafeApp.vault.read(file);
  }

  async modifyVaultFile(file: TFile, content: string): Promise<void> {
    await this.unsafeApp.vault.modify(file, content);
  }

  async createFolder(path: string): Promise<void> {
    await this.unsafeApp.vault.createFolder(path);
  }

  async createFile(path: string, content: string): Promise<TFile> {
    return this.unsafeApp.vault.create(path, content);
  }

  getLeaf(newLeaf: boolean): WorkspaceLeaf {
    return this.unsafeApp.workspace.getLeaf(newLeaf);
  }

  revealLeaf(leaf: WorkspaceLeaf) {
    return this.unsafeApp.workspace.revealLeaf(leaf);
  }

  getLeavesOfType(type: string): WorkspaceLeaf[] {
    return this.unsafeApp.workspace.getLeavesOfType(type);
  }

  getActiveFile(): TFile | null {
    return this.unsafeApp.workspace.getActiveFile();
  }

  getActiveMarkdownView(): MarkdownView | null {
    return this.unsafeApp.workspace.getActiveViewOfType(MarkdownView);
  }

  getActiveMarkdownEditor(): Editor | null {
    return this.getActiveMarkdownView()?.editor ?? null;
  }
}
