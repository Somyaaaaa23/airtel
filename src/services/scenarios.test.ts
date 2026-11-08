import { describe, expect, it } from "vitest";
import { DEMOS } from "../data/demos";
import { runAllScenarios } from "./scenarios";

describe("demo scenarios", () => {
  it("every scenario shows the outcome it claims", async () => {
    const results = await runAllScenarios(DEMOS);
    const failed = results.filter((r) => !r.pass).map((r) => `${r.id}: ${r.checks.filter((c) => !c.ok).map((c) => c.label).join(", ")}`);
    expect(failed).toEqual([]);
    expect(results).toHaveLength(DEMOS.length);
  });
});
