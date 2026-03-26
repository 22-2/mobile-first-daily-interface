import * as Comlink from "comlink";
import type { ScanWorkerAPI } from "src/db/worker-api";

export type WorkerFactory = () => Worker;

export class ScanWorkerPool {
  private remotes: Comlink.Remote<ScanWorkerAPI>[] = [];
  private workers: Worker[] = [];
  private idx = 0;

  constructor(count: number, factory: WorkerFactory) {
    for (let i = 0; i < count; i++) {
      const w = factory();
      this.workers.push(w);
      this.remotes.push(Comlink.wrap<ScanWorkerAPI>(w));
    }
  }

  next(): Comlink.Remote<ScanWorkerAPI> {
    if (this.remotes.length === 0) throw new Error("No workers in pool");
    const r = this.remotes[this.idx % this.remotes.length];
    this.idx += 1;
    return r;
  }

  async dispose(): Promise<void> {
    for (const remote of this.remotes) {
      await remote.dispose();
    }

    for (const w of this.workers) {
      w.terminate();
    }

    this.remotes = [];
    this.workers = [];
  }
}
