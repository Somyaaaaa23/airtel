import { BUSINESS_TYPES, CITIES } from "../data/reference";
import { product } from "../engine/catalogue";
import { productForNeed } from "../engine/recommend";
import type { Need, Profile, Segment, SpeedPref, Tier } from "../engine/types";
import type { Extracted } from "../services/nlu";

export type GstState = "none" | "later" | "awaiting" | "Active" | "Cancelled" | "Suspended" | "NotFound";

export interface Draft {
  businessTypeId?: string;
  chain?: boolean;
  employees?: number;
  sites?: number;
  city?: string; // undefined + tier set = "other city"
  tier?: Tier;
  gst?: GstState;
  gstin?: string;
  legalName?: string;
  /** Everything they use for internet today: chip keys, plus "other:<text>" for answers they typed. */
  currentInternet?: string[];
  monthlySpend?: number;
  preNeeds: Need[]; // picked up from free text, pre-selected on the needs step
  needs?: Need[]; // confirmed
  speedPref?: SpeedPref;
  lines?: number;
  cameras?: number;
  vehicles?: number;
  machines?: number;
  pincode?: string;
  fibreFeasible?: boolean;
}

export type Step =
  | "business" | "employees" | "sites" | "city" | "gstin" | "gstin_type" | "internet" | "spend"
  | "needs" | "speed" | "lines" | "cameras" | "vehicles" | "machines" | "pincode" | "done";

export function segmentOf(d: Draft): Segment {
  const bt = BUSINESS_TYPES.find((b) => b.id === d.businessTypeId);
  let seg: Segment = bt?.segment ?? "micro";
  if ((seg === "micro" || seg === "prof") && ((d.sites ?? 1) >= 3 || (seg === "micro" && d.chain))) seg = "multi";
  return seg;
}

export function needsLine(needs: Need[], segment: Segment): boolean {
  const stub = { segment } as Profile;
  return needs.includes("internet") ||
    needs.some((n) => n !== "internet" && product(productForNeed(n, stub, "recommended")).requiresOneOf.length > 0);
}

export function nextStep(d: Draft): Step {
  if (!d.businessTypeId) return "business";
  if (d.employees === undefined) return "employees";
  if (d.sites === undefined) return "sites";
  if (d.tier === undefined) return "city";
  if (d.gst === undefined) return "gstin";
  if (d.gst === "awaiting") return "gstin_type";
  if (d.currentInternet === undefined) return "internet";
  if (d.monthlySpend === undefined) return "spend";
  if (d.needs === undefined) return "needs";
  if (d.needs.includes("internet") && d.speedPref === undefined && segmentOf(d) !== "micro") return "speed";
  if (d.needs.includes("mobile_lines") && d.lines === undefined) return "lines";
  if (d.needs.includes("cctv") && d.cameras === undefined) return "cameras";
  if (d.needs.includes("fleet") && d.vehicles === undefined) return "vehicles";
  if (d.needs.includes("machine_iot") && d.machines === undefined) return "machines";
  if (needsLine(d.needs, segmentOf(d)) && d.fibreFeasible === undefined) return "pincode";
  return "done";
}

/** Merges what the owner typed into the draft. Only fills gaps; chips the owner tapped are never overwritten. */
export function mergeExtracted(d: Draft, e: Extracted): Draft {
  const n: Draft = { ...d, preNeeds: [...d.preNeeds] };
  if (e.businessTypeId && !n.businessTypeId) n.businessTypeId = e.businessTypeId;
  if (e.chain) n.chain = true;
  if (e.employees !== undefined && n.employees === undefined) n.employees = Math.max(1, e.employees);
  if (e.sites !== undefined && n.sites === undefined) n.sites = Math.max(1, e.sites);
  if (e.city && n.tier === undefined) {
    const c = CITIES.find((x) => x.city === e.city)!;
    n.city = c.city; n.tier = c.tier;
  }
  if (e.hasGstin === false && n.gst === undefined) n.gst = "none";
  if (e.monthlySpend !== undefined && n.monthlySpend === undefined) n.monthlySpend = e.monthlySpend;
  for (const need of e.needs) if (!n.preNeeds.includes(need)) n.preNeeds.push(need);
  if (n.needs) for (const need of e.needs) if (!n.needs.includes(need)) n.needs = [...n.needs, need];
  if (e.speedPref && n.speedPref === undefined) n.speedPref = e.speedPref;
  if (e.lines !== undefined && n.lines === undefined) n.lines = e.lines;
  if (e.cameras !== undefined && n.cameras === undefined) n.cameras = e.cameras;
  if (e.vehicles !== undefined && n.vehicles === undefined) n.vehicles = e.vehicles;
  if (e.machines !== undefined && n.machines === undefined) n.machines = e.machines;
  return n;
}

export function toProfile(d: Draft): Profile {
  const segment = segmentOf(d);
  return {
    businessType: d.businessTypeId,
    segment,
    employees: d.employees ?? 1,
    sites: d.sites ?? 1,
    city: d.city,
    tier: d.tier ?? 2,
    hasActiveGstin: d.gst === "Active" || d.gst === "later",
    gstinStatus: d.gst === "Cancelled" || d.gst === "Suspended" || d.gst === "NotFound" || d.gst === "Active" ? d.gst : undefined,
    monthlySpend: d.monthlySpend,
    currentInternet: d.currentInternet,
    gstin: d.gstin,
    legalName: d.legalName,
    state: CITIES.find((c) => c.city === d.city)?.state,
    needs: d.needs ?? [],
    speedPref: d.speedPref ?? "auto",
    lines: d.lines,
    cameras: d.cameras,
    vehicles: d.vehicles,
    machines: d.machines,
    fibreFeasible: d.fibreFeasible,
  };
}

/** Order of need chips, most relevant first for the segment. */
export const NEED_ORDER: Record<Segment, Need[]> = {
  micro: ["internet", "pos_billing", "cctv", "whatsapp", "guest_wifi", "mobile_lines", "website", "sms", "backup_internet", "device_security"],
  prof: ["internet", "mobile_lines", "email_office", "calling", "device_security", "data_backup", "backup_internet", "whatsapp", "website", "toll_free"],
  multi: ["internet", "multisite_network", "pos_billing", "cctv", "backup_internet", "guest_wifi", "mobile_lines", "whatsapp", "toll_free", "firewall"],
  mfg: ["internet", "backup_internet", "machine_iot", "fleet", "mobile_lines", "cctv", "firewall", "static_ip", "device_security", "data_backup"],
};
export const ALL_NEEDS: Need[] = ["internet", "backup_internet", "mobile_lines", "calling", "toll_free", "whatsapp", "sms", "email_office", "website", "pos_billing", "cctv", "guest_wifi", "device_security", "firewall", "data_backup", "static_ip", "multisite_network", "machine_iot", "fleet"];

export const EMPLOYEE_CHIPS: [string, number][] = [["1", 1], ["2", 2], ["3–4", 4], ["5–9", 7], ["10–24", 15], ["25–99", 40], ["100+", 120]];
export const SITE_CHIPS: [string, number][] = [["1", 1], ["2", 2], ["3–5", 4], ["6–10", 8], ["11+", 12]];
export const SPEND_CHIPS: [string, number][] = [["< ₹1,000", 750], ["₹1,000–2,500", 1750], ["₹2,500–5,000", 3750], ["₹5,000–10,000", 7500], ["> ₹10,000", 15000]];
export const COUNT_CHIPS: Record<"lines" | "cameras" | "vehicles" | "machines", number[]> = {
  lines: [1, 2, 3, 5, 10], cameras: [2, 4, 8, 16], vehicles: [1, 3, 5, 10], machines: [4, 8, 12, 20],
};
export const INTERNET_CHIPS = ["net_hotspot", "net_dongle", "net_home", "net_cable", "net_business", "net_leased", "net_none"] as const;
/** "Nothing yet" can't be combined with anything else. */
export const NET_NONE = "net_none";
export const OTHER_PREFIX = "other:";
export const SPEED_CHIPS: SpeedPref[] = ["auto", "basic", "fast", "gigabit", "dedicated"];
