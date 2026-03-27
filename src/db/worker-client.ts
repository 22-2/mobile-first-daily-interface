import * as Comlink from "comlink";
import type { IDBService } from "src/db/interfaces/IDBService";

export class WorkerClient {
  private static instance: Comlink.Remote<IDBService> | null = null;
  private static worker: Worker | null = null;

  static get(): Comlink.Remote<IDBService> {
    if (!this.instance) {
      // @ts-ignore - Vite handled worker import
      this.worker = new Worker(new URL("./scan.worker.ts", import.meta.url), {
        type: "module",
      });
      this.instance = Comlink.wrap<IDBService>(this.worker);
    }
    return this.instance;
  }

  static async dispose() {
    if (this.instance) {
      await this.instance.dispose();
      this.instance = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
