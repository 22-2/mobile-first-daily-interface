import type * as Comlink from "comlink";
import type { IDBService } from "src/db/interfaces/IDBService";
import { WorkerClient } from "src/db/worker-client";

/**
 * シングルソース化されたWorker内のデータベースサービスを取得するフック。
 */
export function useMFDIDB(): Comlink.Remote<IDBService> {
  return WorkerClient.get();
}
