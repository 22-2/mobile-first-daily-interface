import "fake-indexeddb/auto";

// Ensure tests run in a consistent timezone across environments.
// Using 'Asia/Tokyo' preserves existing expectations in tests that
// assert formatted local times (e.g. 16:00:00 JST).
process.env.TZ = "Asia/Tokyo";

import { afterEach, beforeEach, vi } from "vitest";

// Load moment after TZ is set so it picks up the intended timezone.
const momentModule = await import("moment");
const moment = (momentModule as any).default ?? momentModule;
(window as any).moment = moment;
(window as any).activeDocument = document;

// Provide a minimal Worker stub for the test environment so imports
// that rely on `Worker` (e.g. Vite inline workers) don't throw in Node/JSDOM.
if (typeof (globalThis as any).Worker === "undefined") {
  class TestWorker {
    onmessage: ((e: any) => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    constructor(_script: string | Blob) {}
    postMessage(_msg: unknown) {}
    addEventListener(_type: string, _listener: any) {}
    removeEventListener(_type: string, _listener: any) {}
    terminate() {}
  }
  (globalThis as any).Worker = TestWorker as any;
}

// Default fake timers + deterministic system time for most tests.
// Individual tests may override this if they need a different time.
beforeEach(() => {
  vi.useFakeTimers();
  // Default 'now' matching existing test expectations
  vi.setSystemTime(new Date("2026-03-02T16:00:00.000+09:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
}
