import { CONNECTIVITY, FIBRE_PRODUCTS, product } from "./catalogue";
import { checkDependency, checkProduct } from "./eligibility";
import { computeQuote } from "./quote";
import type { Blocked, LineItem, Need, Note, Plan, Profile, Recommendation, Segment, SpeedPref } from "./types";

type Variant = "recommended" | "starter";

/** Which catalogue product serves each need ("internet" is chosen separately, see pickConnectivity). */
export function productForNeed(need: Exclude<Need, "internet">, profile: Profile, variant: Variant): string {
  switch (need) {
    case "mobile_lines": return variant === "starter" || profile.segment === "micro" ? "P07" : "P08";
    case "backup_internet": return "P09";
    case "multisite_network": return "P10";
    case "static_ip": return "P11";
    case "calling": return "P12";
    case "toll_free": return "P13";
    case "sms": return "P14";
    case "whatsapp": return "P15";
    case "email_office": return "P16";
    case "data_backup": return "P17";
    case "website": return "P18";
    case "pos_billing": return "P19";
    case "device_security": return "P20";
    case "firewall": return "P21";
    case "guest_wifi": return "P22";
    case "cctv": return "P23";
    case "machine_iot": return "P24";
    case "fleet": return "P25";
  }
}

/** Offered instead when the asked-for product is not allowed (only if the substitute itself is allowed). */
const SUBSTITUTE: Record<string, string> = {
  P10: "P09", // SD-WAN -> backup failover per site
  P21: "P20", // managed firewall -> endpoint security
  P12: "P07", // cloud telephony -> business mobile lines
};

/** Optional extras suggested per segment, switched off by default. */
const ADDONS: Record<Segment, string[]> = {
  micro: ["P19", "P22", "P18"],
  prof: ["P20", "P17", "P09"],
  multi: ["P09", "P23", "P20"],
  mfg: ["P09", "P20", "P17"],
};

const CHAINS: Record<Exclude<SpeedPref, "auto">, string[]> = {
  basic: ["P01"],
  fast: ["P02", "P01"],
  gigabit: ["P03", "P02", "P01"],
  dedicated: ["P06", "P05", "P03", "P02", "P01"],
};

function defaultSpeed(profile: Profile): Exclude<SpeedPref, "auto"> {
  if (profile.segment === "micro") return "basic";
  if (profile.segment === "prof") return profile.employees >= 5 ? "fast" : "basic";
  return "fast";
}

/**
 * Picks the main line for each site: the fastest allowed product in the chain for the owner's speed preference,
 * falling back down the chain, then to 5G AirFiber when fibre is not feasible. `allowed` restricts the choice to a
 * dependency's `requires_one_of` list.
 */
export function pickConnectivity(profile: Profile, variant: Variant, allowed?: string[]): { id: string | null; notes: Note[] } {
  const explicit = profile.speedPref !== "auto";
  let pref = explicit ? (profile.speedPref as Exclude<SpeedPref, "auto">) : defaultSpeed(profile);
  if (variant === "starter" && !explicit) pref = "basic";
  const chain = CHAINS[pref].filter((id) => !allowed || allowed.includes(id));
  const notes: Note[] = [];
  let picked: string | null = null;
  for (const id of chain) {
    if (checkProduct(id, profile).length === 0) { picked = id; break; }
  }
  if (!picked && (!allowed || allowed.includes("P04")) && checkProduct("P04", profile).length === 0) {
    picked = "P04";
    if (profile.fibreFeasible === false) notes.push({ code: "airfiber_fallback", to: "P04" });
  }
  if (explicit && chain.length && picked !== chain[0] && picked) {
    // One note is enough: the downgrade note already says fibre isn't available.
    notes.splice(0, notes.length, { code: "downgraded", from: chain[0], to: picked, blocks: checkProduct(chain[0], profile) });
  }
  return { id: picked, notes };
}

export function quantityFor(id: string, profile: Profile): number {
  const { employees: e, sites: s } = profile;
  switch (id) {
    case "P01": case "P02": case "P03": case "P04": case "P05": case "P06":
    case "P09": case "P10": case "P21": case "P22": case "P19":
      return s;
    case "P07": case "P08": return profile.lines ?? (profile.segment === "micro" ? 2 : Math.min(6, Math.max(2, Math.ceil(e / 5))));
    case "P12": return Math.min(4, Math.max(2, Math.ceil(e / 10)));
    case "P16": return Math.max(1, Math.ceil(e * 0.6));
    case "P20": return Math.max(2, Math.ceil(e * 0.4));
    case "P23": return profile.cameras ?? 2 * s;
    case "P24": return profile.machines ?? 8;
    case "P25": return profile.vehicles ?? 3;
    default: return 1;
  }
}

function buildPlan(profile: Profile, variant: Variant): { items: LineItem[]; blocked: Blocked[]; notes: Note[] } {
  const items: LineItem[] = [];
  const blocked: Blocked[] = [];
  const notes: Note[] = [];
  const has = (id: string) => items.some((i) => i.productId === id);
  const ids = () => items.map((i) => i.productId);
  const add = (item: Omit<LineItem, "qty" | "optional">) => {
    if (!has(item.productId)) items.push({ ...item, qty: quantityFor(item.productId, profile), optional: false });
  };

  if (profile.gstinStatus === "Cancelled" || profile.gstinStatus === "Suspended") notes.push({ code: "gstin_inactive" });

  // 1. Main connectivity: asked for, or needed by something else the owner asked for.
  const others = profile.needs.filter((n): n is Exclude<Need, "internet"> => n !== "internet");
  const othersNeedLine = others.some((n) => product(productForNeed(n, profile, variant)).requiresOneOf.length > 0);
  if (profile.needs.includes("internet") || othersNeedLine) {
    const { id, notes: n } = pickConnectivity(profile, variant);
    notes.push(...n);
    if (id) add({ productId: id, reason: profile.needs.includes("internet") ? { kind: "asked", need: "internet" } : { kind: "base", for: [] } });
  }

  // 2. Every other need, checked against the catalogue rules.
  for (const need of others) {
    const id = productForNeed(need, profile, variant);
    const blocks = checkProduct(id, profile);
    if (!blocks.length) {
      const dep = checkDependency(id, ids());
      if (!dep) { add({ productId: id, reason: { kind: "asked", need } }); continue; }
      // No line in the bundle yet that satisfies it: add one only if the bundle has no main line at all.
      const hasLine = ids().some((x) => CONNECTIVITY.includes(x));
      const pick = hasLine ? { id: null } : pickConnectivity(profile, variant, dep.options);
      if (pick.id) {
        add({ productId: pick.id, reason: { kind: "base", for: [] } });
        add({ productId: id, reason: { kind: "asked", need } });
        continue;
      }
      blocks.push(dep);
    }
    const alt = SUBSTITUTE[id];
    const altOk = alt && !checkProduct(alt, profile).length && !checkDependency(alt, ids());
    if (altOk && !(alt === "P07" && has("P08"))) add({ productId: alt, reason: { kind: "substitute", for: id, need } });
    blocked.push({ productId: id, need, blocks, alternative: altOk ? alt : undefined });
  }

  // 3. Explain why each line that wasn't asked for is there; drop it if nothing ended up needing it.
  for (const item of items) {
    if (item.reason.kind === "base") {
      item.reason = { kind: "base", for: items.filter((i) => product(i.productId).requiresOneOf.includes(item.productId)).map((i) => i.productId) };
    }
  }
  const kept = items.filter((i) => !(i.reason.kind === "base" && i.reason.for.length === 0));
  return { items: kept, blocked, notes };
}

export function recommend(profile: Profile): Recommendation {
  const rec = buildPlan(profile, "recommended");
  const plans: Plan[] = [{ key: "recommended", items: rec.items }];

  const starter = buildPlan(profile, "starter");
  const recTotal = computeQuote(rec.items).monthly;
  const starterTotal = computeQuote(starter.items).monthly;
  if (starter.items.length && starterTotal <= recTotal * 0.9) plans.push({ key: "starter", items: starter.items });

  const inBundle = rec.items.map((i) => i.productId);
  const addons: LineItem[] = ADDONS[profile.segment]
    .filter((id) => !inBundle.includes(id) && !rec.blocked.some((b) => b.productId === id))
    .filter((id) => !checkProduct(id, profile).length && !checkDependency(id, inBundle))
    .filter((id) => !product(id).requiresOneOf.length || inBundle.length > 0)
    .map((id) => ({ productId: id, qty: quantityFor(id, profile), reason: { kind: "addon", segment: profile.segment }, optional: true }));

  return { plans, addons, blocked: rec.blocked, notes: rec.notes };
}

export { FIBRE_PRODUCTS };
