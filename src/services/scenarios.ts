/**
 * Runs a demo scenario headlessly through the same pipeline the advisor uses: the owner's message is parsed,
 * the GSTIN is looked up in the registry, site feasibility is checked, and the rules engine recommends.
 * Unanswered optional questions take their skip defaults. Each scenario then checks the outcome it claims to show.
 */
import { mergeExtracted, skipStep, toProfile, type Draft } from "../advisor/flow";
import type { Demo } from "../data/demos";
import { defaultPlan, recommend } from "../engine/recommend";
import type { Profile, Recommendation } from "../engine/types";
import { checkFeasibility } from "./feasibility";
import { extract } from "./nlu";
import { lookupGstin } from "./registry";

export interface ScenarioOutcome { profile: Profile; rec: Recommendation; items: string[]; blocked: Record<string, string[]>; notes: string[] }
export interface Check { label: string; ok: boolean }
export interface ScenarioResult { id: string; pass: boolean; checks: Check[] }

export async function runScenario(text: string): Promise<ScenarioOutcome> {
  const e = extract(text);
  let d: Draft = mergeExtracted({ preNeeds: [] }, e);
  if (e.gstin) {
    const r = await lookupGstin(e.gstin);
    d = r.result === "found" ? { ...d, gst: r.record.status === "Active" ? "Active" : r.record.status, gstin: e.gstin, legalName: r.record.legalName }
      : r.result === "not_found" ? { ...d, gst: "NotFound", gstin: e.gstin } : { ...d, gst: "none" };
  }
  if (d.gst === undefined) d = { ...d, gst: "none" };
  if (e.pincode) d = { ...d, pincode: e.pincode, fibreFeasible: (await checkFeasibility(e.pincode)).fibre };
  d = { ...d, employees: d.employees ?? 1, sites: d.sites ?? 1, tier: d.tier ?? 2, needs: d.needs ?? d.preNeeds };
  for (const s of ["internet", "spend", "speed", "lines", "cameras", "vehicles", "machines", "pincode"] as const) d = skipStep(d, s);
  const profile = toProfile(d);
  const rec = recommend(profile);
  const plan = rec.plans.find((p) => p.key === defaultPlan(rec, profile))!;
  return {
    profile, rec,
    items: plan.items.map((i) => i.productId),
    blocked: Object.fromEntries(rec.blocked.map((b) => [b.productId, b.blocks.map((x) => x.code)])),
    notes: rec.notes.map((n) => n.code),
  };
}

const has = (o: ScenarioOutcome, id: string): Check => ({ label: `includes ${id}`, ok: o.items.includes(id) });
const lacks = (o: ScenarioOutcome, id: string): Check => ({ label: `does not include ${id}`, ok: !o.items.includes(id) });
const blockedFor = (o: ScenarioOutcome, id: string, code: string): Check => ({ label: `${id} left out (${code})`, ok: !!o.blocked[id]?.includes(code) });
const note = (o: ScenarioOutcome, code: string): Check => ({ label: `note: ${code}`, ok: o.notes.includes(code) });
const fact = (label: string, ok: boolean): Check => ({ label, ok });

/** The outcome each scenario claims in its "expected outcome" text, as checks on the engine's answer. */
const EXPECT: Record<string, (o: ScenarioOutcome) => Check[]> = {
  kirana: (o) => [fact("no active GSTIN", !o.profile.hasActiveGstin), blockedFor(o, "P15", "gstin"), has(o, "P23")],
  dental: (o) => [fact("Tier-2 city", o.profile.tier === 2), lacks(o, "P03"), has(o, "P02"), note(o, "downgraded")],
  restaurant: (o) => [fact("multi-site segment", o.profile.segment === "multi"), has(o, "P10"), has(o, "P19"), has(o, "P23")],
  factory: (o) => [fact("no fibre at PIN 800006", o.profile.fibreFeasible === false), lacks(o, "P05"), lacks(o, "P06"), has(o, "P04")],
  cancelled: (o) => [fact("GSTIN cancelled", o.profile.gstinStatus === "Cancelled"), blockedFor(o, "P14", "gstin"), blockedFor(o, "P15", "gstin")],
  insurance: (o) => [fact("GSTIN active", o.profile.hasActiveGstin), has(o, "P16"), has(o, "P20")],
  furniture: (o) => [fact("GSTIN active", o.profile.hasActiveGstin), fact("manufacturer", o.profile.segment === "mfg"), has(o, "P23"), has(o, "P24")],
  hindi: (o) => [fact("pharmacy understood", o.profile.businessType === "pharmacy"), fact("Indore understood", o.profile.city === "Indore"), has(o, "P23")],
};

export async function checkScenario(d: Demo): Promise<ScenarioResult> {
  const o = await runScenario(d.text);
  const checks = (EXPECT[d.id] ?? (() => [fact("has a recommendation", o.items.length > 0)]))(o);
  return { id: d.id, pass: checks.every((c) => c.ok), checks };
}

export const runAllScenarios = (demos: Demo[]) => Promise.all(demos.map(checkScenario));
