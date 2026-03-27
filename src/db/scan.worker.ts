// src/db/scan.worker.ts
import * as Comlink from "comlink";
import { DexieDBService } from "src/db/impl/DexieDBService";

console.log("Worker loading..."); // これが出るか確認

try {
  const dbService = new DexieDBService();
  Comlink.expose(dbService);
  console.log("Worker exposed!");
} catch (e) {
  console.error("Worker init error:", e);
}
