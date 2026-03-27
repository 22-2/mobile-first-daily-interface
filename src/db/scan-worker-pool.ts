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

  next(): { remote: Comlink.Remote<ScanWorkerAPI>; worker: Worker } {
    if (this.remotes.length === 0) throw new Error("No workers in pool");
    const pos = this.idx % this.remotes.length;
    const r = this.remotes[pos];
    const w = this.workers[pos];
    this.idx += 1;
    return { remote: r, worker: w };
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
