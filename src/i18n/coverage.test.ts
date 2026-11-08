import { describe, expect, it } from "vitest";
import { DEMOS, KYC_DEMOS } from "../data/demos";
import { CITIES } from "../data/reference";
import { allGstins } from "../services/registry";
import { grievanceFor } from "../services/consent";
import { stateName, STRINGS } from "./strings";

const devanagari = /[ऀ-ॿ]/;

describe("Hindi coverage", () => {
  it("every UI string has a Hindi version that isn't just the English copied", () => {
    const same = Object.keys(STRINGS.en).filter((k) => {
      const en = STRINGS.en[k as keyof typeof STRINGS.en];
      const hi = STRINGS.hi[k as keyof typeof STRINGS.hi];
      return !hi || (hi === en && /[a-z]{4,}/.test(en.replace(/\{[^}]+\}|GSTIN|KYC|GST|WhatsApp|Udyam|Accel|Business|Digital|SMS|CCTV|IoT/g, "")));
    });
    expect(same).toEqual([]);
  });
  it("demo scenarios have Hindi names, context, tags, outcome and rule", () => {
    for (const d of DEMOS) {
      for (const v of [d.nameHi, d.contextHi, d.showsHi, d.rule.hi]) expect(v, d.id).toMatch(devanagari);
      // Brand and technology names (CCTV, WhatsApp, SD-WAN) are written the same way in Hindi.
      for (const tag of d.tagsHi) expect(devanagari.test(tag) || /^(CCTV|WhatsApp|SMS|SD-WAN)$/.test(tag), `${d.id}: ${tag}`).toBe(true);
      expect(d.tagsHi).toHaveLength(d.tags.length);
    }
  });
  it("KYC sample notes have Hindi", () => {
    for (const k of KYC_DEMOS) expect(k.showsHi, k.id).toMatch(devanagari);
  });
  it("every state in the city list and GST registry has a Hindi name", () => {
    const states = new Set([...CITIES.map((c) => c.state), ...allGstins().map((g) => g.state).filter(Boolean)]);
    const missing = [...states].filter((s) => !devanagari.test(stateName(s, "hi")));
    expect(missing).toEqual([]);
  });
  it("the grievance officer's title is shown in Hindi", () => {
    expect(grievanceFor("hi").name).toMatch(devanagari);
    expect(grievanceFor("en").name).toBe("Grievance Officer, Accel Business");
  });
});
