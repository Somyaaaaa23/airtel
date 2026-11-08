/**
 * Builds src/data/backoffice.json from smb_leads.csv: funnel and drop-reason summary, channel economics,
 * and the activation propensity model (trained on 80% of leads, scored on the held-out 20%).
 * Run: npm run build:backoffice
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseCsv } from "../src/engine/csv";
import { auc, featureLabel, fit, leadFromCsv, score } from "../src/engine/propensity";

const rows = parseCsv(readFileSync(new URL("../src/data/smb_leads.csv", import.meta.url), "utf8"));
const activated = rows.filter((r) => r.outcome === "Activated");
const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

const STAGES = ["Lead", "Contacted", "Needs assessed", "Quote accepted", "KYC complete", "Activated"];
const reached = (r: Record<string, string>, s: string) => STAGES.indexOf(r.stage_reached) >= STAGES.indexOf(s);
const funnel = STAGES.map((stage) => ({ stage, count: rows.filter((r) => reached(r, stage)).length }));

// Which part of this app answers each drop reason (null = not something a self-serve journey fixes).
const FIXED_BY: Record<string, string | null> = {
  "Owner had no time for a visit": "advisor", "Visit not scheduled by sales": "advisor",
  "Quote too complex to understand": "quote", "Quote took too long to arrive": "quote", "Price too high": "quote",
  "Missing GST or Udyam document": "kyc", "Installation delayed beyond 21 days": "tracker",
  "Unreachable after 3 attempts": "score", "Wrong or invalid number": "otp",
  "Only wanted a mobile plan": "sim", "Found paperwork too long": "kyc", "Document details did not match": "kyc",
  "Authorised signatory not available": "esign", "First payment failed": "payment", "Site not feasible for fibre": "advisor",
};
// Drop reasons where a well-timed call can still win the lead back.
const RECOVERABLE = new Set([
  "Unreachable after 3 attempts", "Owner had no time for a visit", "Visit not scheduled by sales", "Quote took too long to arrive",
  "Quote too complex to understand", "Found paperwork too long", "Authorised signatory not available", "First payment failed",
  "Missing GST or Udyam document", "Decided to wait",
]);
const dropCounts = new Map<string, { count: number; stages: Map<string, number> }>();
for (const r of rows.filter((x) => x.drop_reason)) {
  const e = dropCounts.get(r.drop_reason) ?? { count: 0, stages: new Map() };
  e.count++;
  e.stages.set(r.stage_reached, (e.stages.get(r.stage_reached) ?? 0) + 1);
  dropCounts.set(r.drop_reason, e);
}
const drops = [...dropCounts].map(([reason, e]) => ({
  reason, count: e.count, stage: [...e.stages].sort((a, b) => b[1] - a[1])[0][0], fixedBy: FIXED_BY[reason] ?? null,
})).sort((a, b) => b.count - a.count);

const channels = [...new Set(rows.map((r) => r.lead_source))].map((source) => {
  const rs = rows.filter((r) => r.lead_source === source);
  const act = rs.filter((r) => r.outcome === "Activated").length;
  const cost = rs.reduce((s, r) => s + Number(r.acquisition_cost_inr || 0), 0);
  return { source, leads: rs.length, activationRate: round((act / rs.length) * 100), costPerActivation: act ? Math.round(cost / act) : null };
}).sort((a, b) => b.leads - a.leads);

// Deterministic 80/20 split on the lead number.
const isTest = (r: Record<string, string>) => Number(r.lead_id.slice(1)) % 5 === 0;
const train = rows.filter((r) => !isTest(r)).map((r) => ({ f: leadFromCsv(r), y: r.outcome === "Activated" ? 1 : 0 }));
const test = rows.filter(isTest);
const model = fit(train);
const testScores = test.map((r) => score(model, leadFromCsv(r)));
const testLabels = test.map((r) => (r.outcome === "Activated" ? 1 : 0));
const order = testScores.map((s, i) => i).sort((a, b) => testScores[b] - testScores[a]);
const deciles = Array.from({ length: 10 }, (_, d) => {
  const ids = order.slice(Math.floor((d * order.length) / 10), Math.floor(((d + 1) * order.length) / 10));
  return { decile: d + 1, leads: ids.length, activationRate: round((avg(ids.map((i) => testLabels[i])) * 100)), minScore: round(testScores[ids[ids.length - 1]] * 100) };
});
const top30 = order.slice(0, Math.floor(order.length * 0.3));
const totalPos = testLabels.reduce((s, v) => s + v, 0);
const drivers = Object.entries(model.weights).sort((a, b) => b[1] - a[1]);
const pick = (xs: [string, number][]) => xs.map(([feature, weight]) => ({ feature, label: featureLabel(feature), weight }));

// Hot = top 30% of held-out scores, Warm = next 30%, Cold = the rest.
const sortedScores = [...testScores].sort((a, b) => b - a);
const thresholds = { hot: round(sortedScores[Math.floor(sortedScores.length * 0.3)] * 100, 2), warm: round(sortedScores[Math.floor(sortedScores.length * 0.6)] * 100, 2) };
const label = (s: number) => (s * 100 >= thresholds.hot ? "Hot" : s * 100 >= thresholds.warm ? "Warm" : "Cold");
const callNext = rows
  .filter((r) => r.outcome === "Dropped" && RECOVERABLE.has(r.drop_reason))
  .map((r) => ({ r, s: score(model, leadFromCsv(r)) }))
  .sort((a, b) => b.s - a.s)
  .slice(0, 15)
  .map(({ r, s }) => ({
    leadId: r.lead_id, business: r.business_name, type: r.business_type, city: r.city, contact: `${r.contact_name} (${r.contact_role})`,
    language: r.preferred_language, source: r.lead_source, stage: r.stage_reached, reason: r.drop_reason, score: round(s * 100), label: label(s),
  }));
const winBackPool = rows.filter((r) => r.outcome === "Dropped" && RECOVERABLE.has(r.drop_reason)).length;

const out = {
  source: "smb_leads.csv: 5,000 leads, Apr–Jun 2026 (synthetic hackathon data)",
  kpis: {
    leads: rows.length,
    activated: activated.length,
    activationRate: round((activated.length / rows.length) * 100),
    avgDaysToActivation: round(avg(activated.map((r) => Number(r.days_lead_to_activation)))),
    avgFollowUps: round(avg(activated.map((r) => Number(r.customer_follow_up_calls)))),
    costPerActivation: Math.round(rows.reduce((s, r) => s + Number(r.acquisition_cost_inr || 0), 0) / activated.length),
    avgMonthlyValue: Math.round(avg(activated.map((r) => Number(r.monthly_bundle_value_inr)))),
    churn6m: round((activated.filter((r) => r.churned_within_6_months === "Y").length / activated.length) * 100),
    avgNps: round(avg(activated.map((r) => Number(r.nps_score)))),
  },
  funnel,
  drops,
  channels,
  model,
  metrics: {
    auc: round(auc(testScores, testLabels), 3),
    trainSize: train.length,
    testSize: test.length,
    baseRate: round((totalPos / test.length) * 100),
    top30Capture: round((top30.reduce((s, i) => s + testLabels[i], 0) / totalPos) * 100),
    deciles,
  },
  thresholds,
  callNext,
  winBackPool,
  drivers: { up: pick(drivers.slice(0, 6)), down: pick(drivers.slice(-6).reverse()) },
  sample: order.slice(0, 8).concat(order.slice(-4)).map((i) => ({
    leadId: test[i].lead_id, business: test[i].business_name, type: test[i].business_type, city: test[i].city,
    source: test[i].lead_source, score: round(testScores[i] * 100), outcome: test[i].outcome, dropReason: test[i].drop_reason || null,
  })),
};
writeFileSync(new URL("../src/data/backoffice.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`AUC ${out.metrics.auc} · top 30% of scores hold ${out.metrics.top30Capture}% of activations · base rate ${out.metrics.baseRate}%`);
