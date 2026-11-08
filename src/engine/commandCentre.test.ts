import { describe, expect, it } from "vitest";
import bo from "../data/backoffice.json";
import { parseCsv, toCsv } from "./csv";
import { topLeaks } from "./diagnose";
import { LOST_TO_OWN_PROCESS, lossOf, lostToOwnProcessPct, OWN_PROCESS_REASONS } from "./lossCategories";
import { METRIC_DEFS } from "./metricDefs";

describe("lost to our own process", () => {
  it("is one shared definition that reproduces the problem slide", () => {
    expect(bo.overall.loss).toEqual({ process: 1944, reach: 1594, choice: 1053, network: 41 });
    expect(Math.round(lostToOwnProcessPct(bo.overall.loss))).toBe(42);
    expect(OWN_PROCESS_REASONS.every((r) => lossOf(r) === "process")).toBe(true);
    expect(LOST_TO_OWN_PROCESS.en).toMatch(/our|ours/i);
    expect(LOST_TO_OWN_PROCESS.hi.length).toBeGreaterThan(20);
  });
  it("classifies every drop reason in the data exactly once, matching the build", () => {
    for (const s of bo.segments) for (const r of s.reasons) expect(lossOf(r.reason)).toBe(r.loss);
  });
});

describe("date ranges", () => {
  it("cover every span of months, and the full span equals the headline numbers", () => {
    const m = bo.months;
    expect(Object.keys(bo.ranges)).toHaveLength((m.length * (m.length + 1)) / 2);
    const full = bo.ranges[`${m[0]}..${m[m.length - 1]}` as keyof typeof bo.ranges];
    expect(full.kpis).toEqual(bo.kpis);
    expect(full.funnel).toEqual(bo.funnel);
  });
  it("monthly leads add up to the quarter", () => {
    const sum = bo.months.reduce((s, x) => s + bo.ranges[`${x}..${x}` as keyof typeof bo.ranges].kpis.leads, 0);
    expect(sum).toBe(bo.kpis.leads);
  });
});

describe("fix these 3 first", () => {
  it("ranks fixable leaks by rupees at stake", () => {
    const top = topLeaks(3);
    expect(top).toHaveLength(3);
    expect(top[0].atStake).toBeGreaterThanOrEqual(top[1].atStake);
    expect(top[1].atStake).toBeGreaterThanOrEqual(top[2].atStake);
    expect(top.every((l) => l.fix)).toBe(true);
  });
});

describe("CSV export", () => {
  it("quotes commas, quotes and newlines and reads back the same", () => {
    const rows = [{ name: 'Kirana, "Patna"', note: "line1\nline2", n: 3 }, { name: "Plain", note: "", n: 0 }];
    const csv = toCsv(rows);
    expect(csv.split("\n")[0]).toBe("name,note,n");
    const back = parseCsv(csv);
    expect(back[0].name).toBe('Kirana, "Patna"');
    expect(back[1]).toEqual({ name: "Plain", note: "", n: "0" });
  });
});

describe("metric definitions", () => {
  it("every metric has an English and Hindi definition", () => {
    for (const [id, d] of Object.entries(METRIC_DEFS)) {
      expect(d.en.length, id).toBeGreaterThan(15);
      expect(d.hi.length, id).toBeGreaterThan(10);
    }
  });
});
