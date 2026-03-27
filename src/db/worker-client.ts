import * as Comlink from "comlink";
import type { IDBService } from "src/db/interfaces/IDBService";
import ScanWorkerFactory from "src/db/scan.worker?worker&inline";

export class WorkerClient {
  private static instance: Comlink.Remote<IDBService> | null = null;
  private static worker: Worker | null = null;

  static get(): Comlink.Remote<IDBService> {
    if (!this.instance) {
      this.worker = new ScanWorkerFactory();
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
