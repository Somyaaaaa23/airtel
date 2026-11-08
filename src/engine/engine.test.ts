import { describe, expect, it } from "vitest";
import { CATALOGUE, product } from "./catalogue";
import { checkProduct, dependentsOf, validateBundle } from "./eligibility";
import { gstinChecksum, validateGstinFormat } from "./gstin";
import { computeQuote } from "./quote";
import { defaultPlan, recommend } from "./recommend";
import type { Profile } from "./types";
import { allGstins, lookupGstin, lookupUdyam } from "../services/registry";
import { checkFeasibility } from "../services/feasibility";

const base: Profile = { segment: "micro", employees: 3, sites: 1, tier: 2, hasActiveGstin: false, needs: [], speedPref: "auto" };
const ids = (r: ReturnType<typeof recommend>, plan = 0) => r.plans[plan].items.map((i) => i.productId);
const blockedIds = (r: ReturnType<typeof recommend>) => r.blocked.map((b) => b.productId);

describe("catalogue", () => {
  it("loads 25 products with midpoint list prices", () => {
    expect(CATALOGUE).toHaveLength(25);
    expect(product("P01").price).toBe(1099);
    expect(product("P23").requiresOneOf).toEqual(["P01", "P02", "P03", "P04", "P05", "P06"]);
    expect(product("P03").tiers).toEqual([1]);
  });
});

describe("eligibility rules", () => {
  it("blocks GSTIN-only products for a business without an active GSTIN", () => {
    for (const id of ["P03", "P05", "P06", "P10", "P12", "P13", "P14", "P15", "P21", "P24"]) {
      expect(checkProduct(id, { ...base, employees: 50, sites: 5, tier: 1 }).map((b) => b.code)).toContain("gstin");
    }
  });
  it("Biz Fibre 1G is tier-1 only", () => {
    expect(checkProduct("P03", { ...base, tier: 2, employees: 10, hasActiveGstin: true })).toEqual([{ code: "tier", allowed: [1] }]);
  });
  it("employee and site minimums", () => {
    const p = { ...base, hasActiveGstin: true, tier: 1 as const, employees: 9, sites: 2 };
    expect(checkProduct("P10", p).map((b) => b.code).sort()).toEqual(["employees", "sites"]);
    expect(checkProduct("P06", { ...p, employees: 24 })).toEqual([{ code: "employees", min: 25 }]);
    expect(checkProduct("P12", { ...p, employees: 2 })).toEqual([{ code: "employees", min: 3 }]);
  });
  it("detects broken dependencies when a line is removed", () => {
    expect(dependentsOf("P01", ["P01", "P23", "P22", "P07"]).sort()).toEqual(["P22", "P23"]);
    expect(dependentsOf("P01", ["P01", "P02", "P23"])).toEqual([]);
    expect(validateBundle(["P23"], base)).toEqual([{ productId: "P23", blocks: [{ code: "dependency", options: product("P23").requiresOneOf }] }]);
  });
});

describe("advisor scenarios", () => {
  it("kirana, no GSTIN, wants WhatsApp + CCTV: no WhatsApp API, CCTV gets a fibre line", () => {
    const r = recommend({ ...base, needs: ["whatsapp", "cctv"] });
    expect(ids(r)).toEqual(["P01", "P23"]);
    expect(r.blocked).toEqual([{ productId: "P15", need: "whatsapp", blocks: [{ code: "gstin" }], alternative: undefined }]);
    expect(r.plans[0].items[0].reason).toEqual({ kind: "base", for: ["P23"] });
    expect(r.plans[0].items[1].qty).toBe(2);
  });
  it("asks for 1 Gbps in a tier-2 city: falls back to 300 Mbps with a note", () => {
    const r = recommend({ ...base, segment: "prof", employees: 12, hasActiveGstin: true, needs: ["internet"], speedPref: "gigabit" });
    expect(ids(r)).toEqual(["P02"]);
    expect(r.notes[0]).toMatchObject({ code: "downgraded", from: "P03", to: "P02", blocks: [{ code: "tier" }] });
  });
  it("no fibre at the site: AirFiber, and wired-only add-ons are blocked", () => {
    const r = recommend({ ...base, segment: "prof", employees: 12, hasActiveGstin: true, fibreFeasible: false, needs: ["internet", "static_ip", "backup_internet", "guest_wifi"] });
    expect(ids(r)).toEqual(["P04", "P22"]);
    expect(blockedIds(r).sort()).toEqual(["P09", "P11"]);
    expect(r.notes.map((n) => n.code)).toContain("airfiber_fallback");
  });
  it("SD-WAN with only 2 sites: blocked, backup failover offered instead", () => {
    const r = recommend({ ...base, segment: "multi", employees: 30, sites: 2, tier: 1, hasActiveGstin: true, needs: ["internet", "multisite_network"] });
    expect(r.blocked[0]).toMatchObject({ productId: "P10", blocks: [{ code: "sites", min: 3 }], alternative: "P09" });
    expect(ids(r)).toEqual(["P02", "P09"]);
    expect(r.plans[0].items[1].qty).toBe(2);
  });
  it("multi-site chain gets SD-WAN on every site", () => {
    const r = recommend({ ...base, segment: "multi", employees: 60, sites: 6, tier: 1, hasActiveGstin: true, needs: ["internet", "multisite_network", "pos_billing"] });
    expect(ids(r)).toEqual(["P02", "P10", "P19"]);
    expect(r.plans[0].items.every((i) => i.qty === 6)).toBe(true);
  });
  it("manufacturer with 30 staff wanting a dedicated line gets Leased Line 100; with 15 staff, Leased Line 20", () => {
    const m = { ...base, segment: "mfg" as const, tier: 2 as const, hasActiveGstin: true, needs: ["internet" as const], speedPref: "dedicated" as const };
    expect(ids(recommend({ ...m, employees: 30 }))).toEqual(["P06"]);
    expect(ids(recommend({ ...m, employees: 15 }))).toEqual(["P05"]);
  });
  it("firewall for a 6-person office: blocked (needs 10), endpoint security instead", () => {
    const r = recommend({ ...base, segment: "prof", employees: 6, hasActiveGstin: true, needs: ["internet", "firewall"] });
    expect(r.blocked[0]).toMatchObject({ productId: "P21", blocks: [{ code: "employees", min: 10 }], alternative: "P20" });
    expect(ids(r)).toContain("P20");
  });
  it("cloud telephony for 2 people: blocked, mobile lines offered", () => {
    const r = recommend({ ...base, employees: 2, hasActiveGstin: true, needs: ["calling"] });
    expect(r.blocked[0]).toMatchObject({ productId: "P12", blocks: [{ code: "employees", min: 3 }], alternative: "P07" });
  });
  it("static IP with a leased line is blocked: sold only with Biz Fibre", () => {
    const r = recommend({ ...base, segment: "mfg", employees: 30, hasActiveGstin: true, needs: ["internet", "static_ip"], speedPref: "dedicated" });
    expect(r.blocked[0]).toMatchObject({ productId: "P11", blocks: [{ code: "dependency", options: ["P01", "P02", "P03"] }] });
  });
  it("needs with no dependency don't drag in a broadband line", () => {
    expect(ids(recommend({ ...base, needs: ["mobile_lines", "website", "pos_billing"] }))).toEqual(["P07", "P18", "P19"]);
  });
  it("cancelled GSTIN is treated as no GSTIN, with a note", () => {
    const r = recommend({ ...base, hasActiveGstin: false, gstinStatus: "Cancelled", needs: ["sms"] });
    expect(blockedIds(r)).toEqual(["P14"]);
    expect(r.notes[0].code).toBe("gstin_inactive");
  });
  it("every plan the engine returns passes full bundle validation", () => {
    const needs = ["internet", "backup_internet", "mobile_lines", "calling", "toll_free", "whatsapp", "sms", "email_office", "website", "pos_billing", "cctv", "guest_wifi", "device_security", "firewall", "data_backup", "static_ip", "multisite_network", "machine_iot", "fleet"] as const;
    for (const segment of ["micro", "prof", "multi", "mfg"] as const)
      for (const tier of [1, 2] as const)
        for (const hasActiveGstin of [true, false])
          for (const [employees, sites] of [[1, 1], [4, 1], [12, 2], [30, 4], [120, 12]])
            for (const fibreFeasible of [true, false])
              for (const speedPref of ["auto", "gigabit", "dedicated"] as const) {
                const p: Profile = { segment, tier, hasActiveGstin, employees, sites, fibreFeasible, speedPref, needs: [...needs] };
                const r = recommend(p);
                for (const plan of r.plans) expect(validateBundle(plan.items.map((i) => i.productId), p)).toEqual([]);
                for (const a of r.addons) expect(validateBundle([...r.plans[0].items.map((i) => i.productId), a.productId], p)).toEqual([]);
              }
  });
});

describe("quote", () => {
  it("prices like the leads data: midpoint, setup x qty, longest contract", () => {
    // L-row from smb_leads.csv: P01x1;P07x2;P19x1 -> value 2620, setup 2500, 12 months
    const q = computeQuote([{ productId: "P01", qty: 1 }, { productId: "P07", qty: 2 }, { productId: "P19", qty: 1 }]);
    expect(q.monthly).toBe(1099 + 349 * 2 + 749);
    expect(q.setup).toBe(2500);
    expect(q.contractMonths).toBe(12);
    expect(q.goLiveDays).toBe(5);
  });
});

describe("GSTIN and registries", () => {
  it("every registry GSTIN passes the format + checksum check", () => {
    const all = allGstins();
    expect(all.length).toBe(3534);
    expect(all.filter((g) => !validateGstinFormat(g.gstin).ok)).toEqual([]);
  });
  it("rejects a bad checksum", () => {
    const good = "32TTNXB7384T1ZW";
    const bad = good.slice(0, 14) + (gstinChecksum(good.slice(0, 14)) === "A" ? "B" : "A");
    expect(validateGstinFormat(bad)).toEqual({ ok: false, error: "checksum" });
  });
  it("looks up status and Udyam", async () => {
    expect(await lookupGstin("32TTNXB7384T1ZW")).toMatchObject({ result: "found", record: { status: "Active" } });
    expect(await lookupUdyam("UDYAM-KL-00-3078801")).toMatchObject({ result: "found", record: { city: "Kochi" } });
    expect((await lookupUdyam("UDYAM-KL-0-30788")).result).toBe("invalid_format");
  });
  it("mock feasibility is deterministic", async () => {
    expect((await checkFeasibility("452030")).fibre).toBe(false);
    expect((await checkFeasibility("302001")).fibre).toBe(true);
  });
});

describe("plan tiers", () => {
  const clinic: Profile = { ...base, segment: "prof", employees: 12, tier: 1, hasActiveGstin: true, needs: ["internet", "calling", "email_office", "device_security"], speedPref: "fast" };
  it("Pro is the recommended plan plus every add-on, and every rule still holds", () => {
    const r = recommend(clinic);
    const pro = r.plans.find((p) => p.key === "pro")!;
    expect(pro.items.length).toBe(r.plans[0].items.length + r.addons.length);
    expect(validateBundle(pro.items.map((i) => i.productId), clinic)).toEqual([]);
  });
  it("starts with Essential when Recommended costs more than twice today's spend", () => {
    const r = recommend({ ...clinic, monthlySpend: 1000 });
    expect(defaultPlan(r, { ...clinic, monthlySpend: 1000 })).toBe(r.plans.some((p) => p.key === "starter") ? "starter" : "recommended");
    expect(defaultPlan(r, { ...clinic, monthlySpend: 100000 })).toBe("recommended");
  });
});
