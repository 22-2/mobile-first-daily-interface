import { createBuiltinPluginManager } from "src/core/plugin-manager";
import { describe, expect, it, vi } from "vitest";

describe("builtin plugin manager", () => {
  it("activates built-in services in registration order", () => {
    const calls: string[] = [];
    const context = { marker: "ctx" } as any;
    const manager = createBuiltinPluginManager([
      {
        id: "first",
        activate: (receivedContext) => {
          expect(receivedContext).toBe(context);
          calls.push("first");
        },
      },
      {
        id: "second",
        activate: () => {
          calls.push("second");
        },
      },
    ]);

    manager.activate(context);

    expect(calls).toEqual(["first", "second"]);
  });

  it("allows empty built-in service lists", () => {
    const manager = createBuiltinPluginManager([]);

    expect(() => manager.activate({} as any)).not.toThrow();
  });
});
