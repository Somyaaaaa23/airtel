import { beforeEach, describe, expect, it } from "vitest";
import { loadDemoMode, resetDemoData, saveDemoMode } from "./demo";

/** Minimal in-memory localStorage for the node test environment. */
function installStorage() {
  const m = new Map<string, string>();
  const ls = {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });
  return m;
}

describe("demo mode", () => {
  let store: Map<string, string>;
  beforeEach(() => { store = installStorage(); });

  it("is off until switched on, and remembers the switch", () => {
    expect(loadDemoMode()).toBe(false);
    saveDemoMode(true);
    expect(loadDemoMode()).toBe(true);
    saveDemoMode(false);
    expect(loadDemoMode()).toBe(false);
  });

  it("reset clears every app record but keeps the switch and other sites' data", () => {
    saveDemoMode(true);
    store.set("udyam-digital.orders.v1", "[1]");
    store.set("udyam-digital.leads.v1", "[2]");
    store.set("udyam-digital.consent.v1", "[3]");
    store.set("someone-else", "keep");
    expect(resetDemoData()).toBe(3);
    expect([...store.keys()].sort()).toEqual(["someone-else", "udyam-digital.demo-mode.v1"]);
    expect(loadDemoMode()).toBe(true);
  });
});
