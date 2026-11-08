import { describe, expect, it } from "vitest";
import { CATALOGUE } from "./catalogue";
import { smartPrice } from "./pricing";
import type { Segment } from "./types";

const items = [{ productId: "P02", qty: 3 }, { productId: "P07", qty: 4 }, { productId: "P23", qty: 6 }];

describe("smart price", () => {
  it("never charges below the bottom of the published range, in any segment, at any size", () => {
    for (const segment of ["micro", "prof", "multi", "mfg"] as Segment[]) {
      for (const sites of [1, 3, 8, 40]) {
        const all = CATALOGUE.map((p) => ({ productId: p.id, qty: 2 }));
        const sp = smartPrice(all, { segment, sites });
        for (const l of sp.lines) expect(l.offer).toBeGreaterThanOrEqual(l.floor);
        expect(sp.firstMonth).toBeGreaterThanOrEqual(sp.lines.reduce((s, l) => s + l.floor, 0));
      }
    }
  });
  it("shows a saving against the standard rate", () => {
    const sp = smartPrice(items, { segment: "prof", sites: 1 });
    expect(sp.standard).toBeGreaterThan(sp.monthly);
    expect(sp.savingPct).toBeGreaterThan(0);
  });
  it("gives multi-site businesses a per-site volume discount, capped at 10%", () => {
    expect(smartPrice(items, { segment: "multi", sites: 3 }).volumePct).toBeCloseTo(0.04);
    expect(smartPrice(items, { segment: "multi", sites: 20 }).volumePct).toBeCloseTo(0.1);
    expect(smartPrice(items, { segment: "micro", sites: 3 }).volumePct).toBe(0);
  });
  it("waives setup for micro and manufacturers, and puts manufacturers on a priority crew", () => {
    expect(smartPrice(items, { segment: "micro", sites: 1 }).setupPayable).toBe(0);
    const mfg = smartPrice([{ productId: "P05", qty: 1 }], { segment: "mfg", sites: 1 });
    expect(mfg.setupPayable).toBe(0);
    expect(mfg.goLiveDays).toBeLessThan(mfg.standardGoLiveDays);
  });
});
