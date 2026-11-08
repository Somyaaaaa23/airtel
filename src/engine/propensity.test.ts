import { describe, expect, it } from "vitest";
import raw from "../data/smb_leads.csv?raw";
import bo from "../data/backoffice.json";
import { parseCsv } from "./csv";
import { auc, leadFromCsv, score, type Model } from "./propensity";

const rows = parseCsv(raw);
const model = bo.model as Model;

describe("propensity model", () => {
  it("ranks held-out leads better than chance", () => {
    const test = rows.filter((r) => Number(r.lead_id.slice(1)) % 5 === 0);
    const a = auc(test.map((r) => score(model, leadFromCsv(r))), test.map((r) => (r.outcome === "Activated" ? 1 : 0)));
    expect(a).toBeGreaterThan(0.65);
    expect(Math.abs(a - bo.metrics.auc)).toBeLessThan(0.002); // backoffice.json is in sync with the model code
  });
  it("auc is 1 for a perfect ranking and 0.5 for ties", () => {
    expect(auc([0.1, 0.2, 0.9], [0, 0, 1])).toBe(1);
    expect(auc([0.5, 0.5], [0, 1])).toBe(0.5);
  });
});
