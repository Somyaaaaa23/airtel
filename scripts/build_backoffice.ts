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

// ---- Segment analytics: the four segments behave differently, so every number is also cut by segment. ----
const SEG_KEY: Record<string, string> = {
  "Micro retail & services": "micro", "Professional offices": "prof", "Small multi-site businesses": "multi", "Small manufacturers": "mfg",
};
// Loss categories from the problem slide: our own process, unreachable / not interested, chose not to buy, no network.
const OWN_PROCESS = new Set([
  "Visit not scheduled by sales", "Owner had no time for a visit", "Only wanted a mobile plan", "Quote too complex to understand",
  "Quote took too long to arrive", "Missing GST or Udyam document", "Found paperwork too long", "Authorised signatory not available",
  "Document details did not match", "Installation delayed beyond 21 days", "Customer cancelled before install", "First payment failed",
]);
const UNREACHABLE = new Set(["Unreachable after 3 attempts", "Not interested on first call", "Wrong or invalid number"]);
const lossOf = (reason: string) => (OWN_PROCESS.has(reason) ? "process" : UNREACHABLE.has(reason) ? "reach" : reason === "Site not feasible for fibre" ? "network" : "choice");
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)) : 0;
};
const stageIdx = (r: Record<string, string>) => STAGES.indexOf(r.stage_reached);
const stageConv = (rs: Record<string, string>[]) => STAGES.slice(1).map((s, i) => {
  const prev = rs.filter((r) => stageIdx(r) >= i).length;
  return round((rs.filter((r) => stageIdx(r) >= i + 1).length / Math.max(1, prev)) * 100);
});
const overallReasonShare = new Map([...dropCounts].map(([k, v]) => [k, v.count / rows.length]));

function segmentStats(rs: Record<string, string>[]) {
  const act = rs.filter((r) => r.outcome === "Activated");
  const cost = rs.reduce((s, r) => s + Number(r.acquisition_cost_inr || 0), 0);
  const medBundle = median(act.map((r) => Number(r.monthly_bundle_value_inr)));
  const quoted = rs.filter((r) => stageIdx(r) >= 3);
  const kycRate = (xs: Record<string, string>[]) => round((xs.filter((r) => stageIdx(r) >= 4).length / Math.max(1, xs.length)) * 100);
  // Chance that a lead which reached stage i goes on to activate, for valuing recovered drops.
  const toActivate = STAGES.map((_, i) => act.length / Math.max(1, rs.filter((r) => stageIdx(r) >= i).length));
  const drops = rs.filter((r) => r.drop_reason);
  const reasons = new Map<string, { count: number; stage: number }>();
  for (const r of drops) {
    const e = reasons.get(r.drop_reason) ?? { count: 0, stage: 0 };
    e.count++; e.stage += stageIdx(r);
    reasons.set(r.drop_reason, e);
  }
  const reasonRows = [...reasons].map(([reason, e]) => {
    const stage = Math.round(e.stage / e.count);
    return {
      reason, count: e.count, loss: lossOf(reason), stage: STAGES[stage],
      share: round((e.count / rs.length) * 100),
      lift: round(e.count / rs.length / (overallReasonShare.get(reason) ?? 1), 2),
      // Monthly revenue these drops would have brought if the cause were fixed: an average lead that reached the same stage.
      atStake: Math.round(e.count * toActivate[stage] * medBundle),
      p: round(toActivate[stage], 3),
    };
  }).sort((a, b) => b.count - a.count);
  const productCount = new Map<string, number>();
  for (const r of act) for (const part of r.bundle_products.split(";")) productCount.set(part.split("x")[0], (productCount.get(part.split("x")[0]) ?? 0) + 1);
  const loss = { process: 0, reach: 0, choice: 0, network: 0 } as Record<string, number>;
  for (const r of drops) loss[lossOf(r.drop_reason)]++;
  const sources = [...new Set(rs.map((r) => r.lead_source))].map((source) => {
    const x = rs.filter((r) => r.lead_source === source);
    return { source, leads: x.length, contactRate: round((x.filter((r) => stageIdx(r) >= 1).length / x.length) * 100), activationRate: round((x.filter((r) => r.outcome === "Activated").length / x.length) * 100) };
  }).sort((a, b) => b.leads - a.leads);
  return {
    leads: rs.length,
    share: round((rs.length / rows.length) * 100),
    activated: act.length,
    activationRate: round((act.length / rs.length) * 100),
    medianBundle: medBundle,
    medianSpend: median(rs.map((r) => Number(r.monthly_telecom_spend_inr))),
    bundleToSpend: round(median(act.map((r) => Number(r.monthly_bundle_value_inr) / Math.max(1, Number(r.monthly_telecom_spend_inr)))), 2),
    costPerActivation: Math.round(cost / Math.max(1, act.length)),
    paybackMonths: round(cost / Math.max(1, act.length) / Math.max(1, medBundle), 1),
    daysToLive: round(avg(act.map((r) => Number(r.days_lead_to_activation)))),
    followUps: round(avg(act.map((r) => Number(r.customer_follow_up_calls)))),
    churn: round((act.filter((r) => r.churned_within_6_months === "Y").length / Math.max(1, act.length)) * 100),
    nps: round(avg(act.map((r) => Number(r.nps_score)))),
    gstinShare: round((rs.filter((r) => r.has_gstin === "Y").length / rs.length) * 100),
    kycClear: { gst: kycRate(quoted.filter((r) => r.has_gstin === "Y")), noGst: kycRate(quoted.filter((r) => r.has_gstin === "N")) },
    stageConv: stageConv(rs),
    loss,
    reasons: reasonRows,
    topProducts: [...productCount].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ id, attach: round((n / Math.max(1, act.length)) * 100) })),
    sources,
    toActivate: toActivate.map((v) => round(v, 3)),
  };
}
const overall = segmentStats(rows);
const segments = Object.entries(SEG_KEY).map(([name, key]) => ({ key, name, ...segmentStats(rows.filter((r) => r.segment === name)) }));

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
  overall,
  segments,
  stages: STAGES,
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
