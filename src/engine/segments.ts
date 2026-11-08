/**
 * Four segments, four playbooks. The data (smb_leads.csv) shows they fail for different reasons:
 * micro converts at 4.1% and costs ₹20,000 to win a ₹2,470/month customer; professional offices leak at the quote;
 * multi-site is worth ₹28,080/month; manufacturers convert best (12.8%) but take 20.5 days to go live.
 * Each playbook sets how the price is framed, which offer applies, and how the lead is routed (online, assisted, RM, priority crew).
 */
import bo from "../data/backoffice.json";
import type { Segment } from "./types";

export type Route = "self" | "assisted" | "rm" | "priority";
export type PriceFrame = "day" | "staff" | "site" | "downtime";

export interface Playbook {
  key: Segment;
  icon: string;
  route: Route;
  frame: PriceFrame;
  offer: {
    /** Share of the one-time setup fee waived (0–1). */
    setupWaive: number;
    /** Months billed at the bottom of the published price range ("launch price"). */
    launchMonths: number;
    /** First month discount on top (0–1), still never below the catalogue minimum. */
    firstMonthOff: number;
    /** Permanent volume discount per extra site, capped. */
    perSite: number;
    perSiteCap: number;
  };
  /** Install days cut by a priority crew (0–1). */
  installCut: number;
}

export const PLAYBOOKS: Record<Segment, Playbook> = {
  // Price shock is the leak: needs → quote converts at 32% and bundles average 2.7x today's spend. Fully online, ₹/day framing.
  micro: { key: "micro", icon: "🏪", route: "self", frame: "day", offer: { setupWaive: 1, launchMonths: 0, firstMonthOff: 0.5, perSite: 0, perSiteCap: 0 }, installCut: 0 },
  // Leak is at the quote (53%). Launch price for 3 months, specialist call on request, priced per staff member.
  prof: { key: "prof", icon: "🩺", route: "assisted", frame: "staff", offer: { setupWaive: 0.5, launchMonths: 3, firstMonthOff: 0, perSite: 0, perSiteCap: 0 }, installCut: 0 },
  // Highest value (₹28,080). A relationship manager runs the rollout; volume discount per site.
  multi: { key: "multi", icon: "🏬", route: "rm", frame: "site", offer: { setupWaive: 0.5, launchMonths: 0, firstMonthOff: 0, perSite: 0.02, perSiteCap: 0.1 }, installCut: 0 },
  // Best converters, slowest to go live (KYC → live only 54%). Priority install crew and setup waived.
  mfg: { key: "mfg", icon: "🏭", route: "priority", frame: "downtime", offer: { setupWaive: 1, launchMonths: 0, firstMonthOff: 0, perSite: 0, perSiteCap: 0 }, installCut: 0.3 },
};

export type SegmentStats = (typeof bo.segments)[number];
export const segmentStats = (k: Segment): SegmentStats => bo.segments.find((s) => s.key === k)!;
export const OVERALL = bo.overall;
