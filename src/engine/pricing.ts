/**
 * Smart price: what the owner would usually pay, what the bundle costs, and the segment offer on top.
 * - Standard rate = top of Accel's published range per product (what à-la-carte buyers are quoted).
 * - Bundle price = midpoint of the range (what activated customers paid in smb_leads.csv).
 * - Offers come from the segment playbook and never go below the bottom of the published range.
 */
import { product } from "./catalogue";
import { PLAYBOOKS } from "./segments";
import { computeQuote } from "./quote";
import type { Profile } from "./types";

const PER_SITE = new Set(["per site", "per counter"]);

export interface SmartLine { productId: string; qty: number; standard: number; bundle: number; offer: number; floor: number; setup: number }
export interface SmartPrice {
  lines: SmartLine[];
  /** Monthly totals. */
  standard: number;
  bundle: number;
  monthly: number;
  /** Months at launch price, if the playbook gives one. */
  launch?: { months: number; monthly: number };
  firstMonth: number;
  setupFull: number;
  setupPayable: number;
  firstPayment: number;
  savingMonthly: number;
  savingPct: number;
  firstYear: number;
  firstYearStandard: number;
  firstYearSaving: number;
  volumePct: number;
  goLiveDays: number;
  standardGoLiveDays: number;
  contractMonths: number;
}

/** Monthly price of one unit after the segment's volume discount, never below the catalogue minimum. */
export function unitOffer(productId: string, profile: Pick<Profile, "segment" | "sites">): number {
  const pb = PLAYBOOKS[profile.segment];
  const p = product(productId);
  const vol = Math.min(pb.offer.perSiteCap, pb.offer.perSite * Math.max(0, (profile.sites ?? 1) - 1));
  return Math.max(p.priceMin, PER_SITE.has(p.unit) ? Math.round(p.price * (1 - vol)) : p.price);
}

export function smartPrice(items: { productId: string; qty: number }[], profile: Pick<Profile, "segment" | "sites">): SmartPrice {
  const pb = PLAYBOOKS[profile.segment];
  const volumePct = Math.min(pb.offer.perSiteCap, pb.offer.perSite * Math.max(0, (profile.sites ?? 1) - 1));
  const lines = items.map(({ productId, qty }) => {
    const p = product(productId);
    return {
      productId, qty,
      standard: p.priceMax * qty,
      bundle: p.price * qty,
      offer: unitOffer(productId, profile) * qty,
      floor: p.priceMin * qty,
      setup: p.setup * qty,
    };
  });
  const sum = (f: (l: SmartLine) => number) => lines.reduce((s, l) => s + f(l), 0);
  const standard = sum((l) => l.standard);
  const bundle = sum((l) => l.bundle);
  const monthly = sum((l) => l.offer);
  const floor = sum((l) => l.floor);
  const launch = pb.offer.launchMonths ? { months: pb.offer.launchMonths, monthly: floor } : undefined;
  const firstMonth = Math.max(floor, Math.round((launch?.monthly ?? monthly) * (1 - pb.offer.firstMonthOff)));
  const setupFull = sum((l) => l.setup);
  const setupPayable = Math.round(setupFull * (1 - pb.offer.setupWaive));
  const q = computeQuote(items);
  const firstYear = setupPayable + firstMonth
    + (launch ? (launch.months - 1) * launch.monthly + (12 - launch.months) * monthly : 11 * monthly);
  const firstYearStandard = setupFull + 12 * standard;
  return {
    lines, standard, bundle, monthly, launch, firstMonth, setupFull, setupPayable,
    firstPayment: setupPayable + firstMonth,
    savingMonthly: standard - monthly,
    savingPct: standard ? Math.round(((standard - monthly) / standard) * 100) : 0,
    firstYear, firstYearStandard, firstYearSaving: firstYearStandard - firstYear,
    volumePct,
    goLiveDays: Math.max(1, Math.ceil(q.goLiveDays * (1 - pb.installCut))),
    standardGoLiveDays: q.goLiveDays,
    contractMonths: q.contractMonths,
  };
}

/** Monthly price shown per day (30-day month), rounded to the rupee. */
export const perDay = (monthly: number) => Math.round(monthly / 30);
