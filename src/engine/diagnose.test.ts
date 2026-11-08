import { describe, expect, it } from "vitest";
import bo from "../data/backoffice.json";
import { diagnose, LEVERS, simulate, topLeaks, type LeverId } from "./diagnose";

const seg = (k: string) => bo.segments.find((s) => s.key === k)!;

describe("command-centre diagnosis", () => {
  it("finds the problem slide's story in the data", () => {
    const micro = diagnose(seg("micro")).map((f) => f.title);
    expect(micro).toContain("Price shock at the quote");
    expect(micro).toContain("Acquisition cost out of line with value");
    expect(micro).toContain("Weak step: Needs assessed → Quote accepted");
    expect(diagnose(seg("mfg")).map((f) => f.title)).toContain("Slowest to go live");
  });
  it("loss categories add up to the slide: 1,944 own process, 1,594 unreachable, 1,053 chose not to buy, 41 no network", () => {
    expect(bo.overall.loss).toEqual({ process: 1944, reach: 1594, choice: 1053, network: 41 });
  });
  it("simulator: no levers, no change; more recovery, more activations and lower CAC", () => {
    const zero = Object.fromEntries(LEVERS.map((l) => [l.id, 0])) as Record<LeverId, number>;
    const base = Object.fromEntries(LEVERS.map((l) => [l.id, l.rate])) as Record<LeverId, number>;
    expect(simulate(zero).every((i) => i.extra === 0)).toBe(true);
    for (const i of simulate(base)) { expect(i.extra).toBeGreaterThan(0); expect(i.newCac).toBeLessThan(i.cac); }
  });
  it("ranks leaks by revenue at stake", () => {
    const l = topLeaks();
    expect(l[0].atStake).toBeGreaterThanOrEqual(l[l.length - 1].atStake);
  });
});
