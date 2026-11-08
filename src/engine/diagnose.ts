/**
 * Command-centre analytics: where each segment is lacking, and what fixing it is worth.
 * Works on the per-segment numbers in backoffice.json (built from smb_leads.csv by scripts/build_backoffice.ts).
 */
import bo from "../data/backoffice.json";

export type Seg = (typeof bo.segments)[number];
export const STAGES = bo.stages;
export const TRANSITIONS = STAGES.slice(1).map((s, i) => `${STAGES[i]} → ${s}`);

export interface Finding { severity: "high" | "medium"; title: string; detail: string; fix: string }
const pct = (v: number) => `${Math.round(v * 10) / 10}%`;
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Plain-language list of what's wrong in a segment, most serious first. */
export function diagnose(s: Seg, all = bo.overall): Finding[] {
  const out: Finding[] = [];
  const FIX = [
    "Self-serve advisor: no visit needed to assess needs.",
    "Self-serve advisor: no visit needed to assess needs.",
    "Plain-language quote in 2 minutes, budget-first tier and segment offer.",
    "Smart KYC: accepts Udyam / PAN, tells owners exactly what to fix.",
    "Order tracker, owner-picked visit slot, priority crew.",
  ];
  const weak = s.stageConv.map((v, i) => ({ i, gap: all.stageConv[i] - v })).filter((g) => g.gap > 3).sort((a, b) => b.gap - a.gap).slice(0, 2);
  for (const w of weak) {
    out.push({
      severity: w.gap > 8 ? "high" : "medium",
      title: `Weak step: ${TRANSITIONS[w.i]}`,
      detail: `${pct(s.stageConv[w.i])} make it through, against ${pct(all.stageConv[w.i])} across all segments (−${Math.round(w.gap)} pts).`,
      fix: FIX[w.i],
    });
  }
  if (s.bundleToSpend > 2) {
    out.push({
      severity: s.bundleToSpend > 2.6 ? "high" : "medium",
      title: "Price shock at the quote",
      detail: `Bought bundles average ${s.bundleToSpend}× what these owners pay today (median spend ${inr(s.medianSpend)}).`,
      fix: "Start on the Essential tier when Recommended is over 2× spend; frame the price per day; show the saving against the standard rate.",
    });
  }
  if (s.paybackMonths > 3) {
    out.push({
      severity: "high",
      title: "Acquisition cost out of line with value",
      detail: `${inr(s.costPerActivation)} to win a customer worth ${inr(s.medianBundle)}/month: ${s.paybackMonths} months of revenue just to recover it.`,
      fix: "Route this segment fully online (no field visit); spend sales time on Hot leads only.",
    });
  }
  if (s.kycClear.noGst < 50 && s.gstinShare < 95) {
    out.push({
      severity: "high",
      title: "Owners without GSTIN get stuck at KYC",
      detail: `Only ${pct(s.kycClear.noGst)} of quoted leads without a GSTIN clear KYC, against ${pct(s.kycClear.gst)} with one, even when nothing in the plan needs GST.`,
      fix: "Ask only for documents the plan needs; accept Udyam or business PAN.",
    });
  }
  if (s.daysToLive > all.daysToLive + 1.5) {
    out.push({
      severity: "medium",
      title: "Slowest to go live",
      detail: `${s.daysToLive} days from lead to live, against ${all.daysToLive} overall. ${pct(100 - s.stageConv[4])} drop between KYC and activation.`,
      fix: "Priority install crew (30% faster) and an engineer-tracked go-live.",
    });
  }
  if (s.churn > all.churn + 3) {
    out.push({ severity: "medium", title: "Customers leave early", detail: `${pct(s.churn)} churn within 6 months, against ${pct(all.churn)} overall.`, fix: "Right-size the first plan to spend; welcome call after go-live." });
  }
  const over = s.reasons.filter((r) => r.lift >= 1.2 && r.count >= 15).sort((a, b) => b.lift - a.lift)[0];
  if (over) {
    out.push({ severity: "medium", title: `“${over.reason}” over-indexes`, detail: `${over.count} leads (${pct(over.share)} of the segment), ${over.lift}× the average rate.`, fix: LEVERS.find((l) => (l.reasons as readonly string[]).includes(over.reason))?.name ?? "Review with sales." });
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
}

/** What the app changes, as levers: which drop reasons each one answers and a default recovery rate. */
export const LEVERS = [
  { id: "selfserve", name: "Self-serve advisor (no visit needed)", reasons: ["Owner had no time for a visit", "Visit not scheduled by sales"], rate: 0.6 },
  { id: "sim", name: "\"I just need a SIM\" fast path", reasons: ["Only wanted a mobile plan"], rate: 0.7 },
  { id: "quote", name: "2-minute quote, smart price and offers", reasons: ["Quote too complex to understand", "Quote took too long to arrive", "Price too high"], rate: 0.4 },
  { id: "kyc", name: "Smart KYC (Udyam / PAN accepted)", reasons: ["Missing GST or Udyam document", "Found paperwork too long", "Document details did not match"], rate: 0.6 },
  { id: "sign", name: "E-sign and payment retry", reasons: ["Authorised signatory not available", "First payment failed"], rate: 0.7 },
  { id: "track", name: "Tracker and priority install crew", reasons: ["Installation delayed beyond 21 days", "Customer cancelled before install"], rate: 0.5 },
  { id: "reach", name: "OTP-verified numbers and call-next ranking", reasons: ["Unreachable after 3 attempts", "Wrong or invalid number"], rate: 0.25 },
] as const;
export type LeverId = (typeof LEVERS)[number]["id"];

export interface Impact { segment: string; activations: number; extra: number; revenue: number; rate: number; newRate: number; cac: number; newCac: number }

/** Extra activations and monthly revenue if each lever recovers its share of the drops it answers. */
export function simulate(rates: Record<LeverId, number>, segments = bo.segments): Impact[] {
  return segments.map((s) => {
    let extra = 0, revenue = 0;
    for (const l of LEVERS) {
      for (const r of s.reasons.filter((x) => (l.reasons as readonly string[]).includes(x.reason))) {
        extra += r.count * r.p * rates[l.id];
        revenue += r.atStake * rates[l.id];
      }
    }
    const spend = s.costPerActivation * s.activated;
    return {
      segment: s.key, activations: s.activated, extra, revenue,
      rate: s.activationRate, newRate: ((s.activated + extra) / s.leads) * 100,
      cac: s.costPerActivation, newCac: spend / (s.activated + extra),
    };
  });
}

/** Ranked leaks: segment × reason, by monthly revenue lost, for reasons the journey can answer. */
export function topLeaks(n = 8) {
  return bo.segments.flatMap((s) => s.reasons.filter((r) => r.loss === "process" || r.reason === "Unreachable after 3 attempts").map((r) => ({ seg: s, ...r })))
    .sort((a, b) => b.atStake - a.atStake).slice(0, n)
    .map((l) => ({ ...l, fix: LEVERS.find((x) => (x.reasons as readonly string[]).includes(l.reason))?.name ?? "" }));
}
