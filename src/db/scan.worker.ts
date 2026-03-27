import * as Comlink from "comlink";
import { DexieDBService } from "src/db/impl/DexieDBService";

const dbService = new DexieDBService();

Comlink.expose(dbService);
