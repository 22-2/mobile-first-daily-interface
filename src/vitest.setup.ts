import "fake-indexeddb/auto";
import moment from "moment";

// Obsidian provides moment globally. Mock it for tests using the installed package.
(window as any).moment = moment;

if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
}
