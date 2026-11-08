import { describe, expect, it } from "vitest";
import { recommend } from "../engine/recommend";
import { extract } from "../services/nlu";
import { mergeExtracted, nextStep, segmentOf, toProfile, type Draft } from "./flow";

const empty: Draft = { preNeeds: [] };

describe("advisor flow", () => {
  it("asks questions in order and skips what the owner already typed", () => {
    expect(nextStep(empty)).toBe("business");
    const d = mergeExtracted(empty, extract("Pharmacy in Indore, 5 staff, no GST, need CCTV"));
    expect(nextStep(d)).toBe("sites");
    expect(d.preNeeds).toEqual(["cctv"]);
  });
  it("micro shops skip the speed question; others get it", () => {
    const base: Draft = { ...empty, businessTypeId: "kirana", employees: 3, sites: 1, tier: 2, gst: "none", currentInternet: ["net_hotspot"], monthlySpend: 900, needs: ["internet"] };
    expect(nextStep(base)).toBe("pincode");
    expect(nextStep({ ...base, businessTypeId: "dental" })).toBe("speed");
  });
  it("no pincode question when nothing needs a line", () => {
    const d: Draft = { ...empty, businessTypeId: "kirana", employees: 3, sites: 1, tier: 2, gst: "none", currentInternet: ["net_hotspot"], monthlySpend: 900, needs: ["mobile_lines", "website"], lines: 2 };
    expect(nextStep(d)).toBe("done");
  });
  it("3+ shops make a micro business multi-site", () => {
    expect(segmentOf({ ...empty, businessTypeId: "kirana", sites: 3 })).toBe("multi");
    expect(segmentOf({ ...empty, businessTypeId: "kirana", sites: 2 })).toBe("micro");
  });
  it("end-to-end: typed message → profile → recommendation", () => {
    let d = mergeExtracted(empty, extract("Kirana store in Patna, 3 staff, no GST. Need CCTV with 4 cameras, WhatsApp for orders and UPI billing"));
    d = { ...d, sites: 1, currentInternet: ["net_hotspot", "net_home"], monthlySpend: 750, needs: d.preNeeds, fibreFeasible: true };
    expect(nextStep(d)).toBe("done");
    const r = recommend(toProfile(d));
    expect(r.plans[0].items.map((i) => i.productId).sort()).toEqual(["P01", "P19", "P23"]);
    expect(r.plans[0].items.find((i) => i.productId === "P23")!.qty).toBe(4);
    expect(r.blocked.map((b) => b.productId)).toEqual(["P15"]);
  });
});
