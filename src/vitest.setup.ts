import "fake-indexeddb/auto";
import moment from "moment";

// Obsidian provides moment globally. Mock it for tests using the installed package.
// テスト環境のタイムゾーンを日本に固定。
// CI環境がUTCでもローカル環境がJSTでも、moment.format()の出力が一致するようにする
const originalMoment = moment;
(window as any).moment = (...args: any[]) => {
  const m = originalMoment(...args);
  return m.utcOffset(9 * 60); // JST (UTC+9) を強制
};

if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
}
