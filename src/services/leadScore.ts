/**
 * Scores an application from the owner app with the propensity model trained on smb_leads.csv.
 * The app's answers map onto the lead fields the model knows; turnover isn't asked, so it adds nothing.
 */
import bo from "../data/backoffice.json";
import { score, type LeadFeatures, type Model } from "../engine/propensity";
import type { Profile, Segment } from "../engine/types";

const SEGMENT: Record<Segment, string> = {
  micro: "Micro retail & services", prof: "Professional offices", multi: "Small multi-site businesses", mfg: "Small manufacturers",
};
const INTERNET: Record<string, string> = {
  net_hotspot: "Mobile hotspot", net_home: "Home broadband", net_business: "Business broadband", net_leased: "Leased line", net_none: "None",
};

export function leadFromProfile(p: Profile, extra: { lang: "en" | "hi"; hasUdyam: boolean }): LeadFeatures {
  return {
    source: "Website form", // closest channel in the data: a self-serve digital lead
    segment: SEGMENT[p.segment],
    tier: p.tier,
    language: extra.lang === "hi" ? "Hindi" : "English",
    employees: p.employees,
    sites: p.sites,
    turnover: "",
    hasGstin: p.hasActiveGstin,
    hasUdyam: extra.hasUdyam,
    internet: INTERNET[p.currentInternet ?? ""] ?? "None",
    spend: p.monthlySpend ?? 0,
    interests: p.needs.length,
    role: "Owner",
  };
}

export const scoreProfile = (p: Profile, extra: { lang: "en" | "hi"; hasUdyam: boolean }) => score(bo.model as Model, leadFromProfile(p, extra));
