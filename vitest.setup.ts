import "fake-indexeddb/auto";
import moment from "moment";

(window as any).moment = moment;
(window as any).activeDocument = document;

if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
}
