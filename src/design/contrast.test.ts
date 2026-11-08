import { describe, expect, it } from "vitest";
import css from "../styles.css?raw";
import { contrast, TEXT_PAIRS, themeTokens } from "./contrast";

describe("design tokens", () => {
  const { light, dark } = themeTokens(css);

  it("computes WCAG contrast like the reference values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("uses Airtel red for the primary action", () => {
    expect(light["--primary"]).toBe("#d80000");
  });

  for (const [name, theme] of [["light", light], ["dark", dark]] as const) {
    it(`meets WCAG AA (4.5:1) for every text pair in ${name} mode`, () => {
      const failures = TEXT_PAIRS.filter(([fg, bg]) => {
        expect(theme[fg], `${fg} missing in ${name}`).toBeDefined();
        expect(theme[bg], `${bg} missing in ${name}`).toBeDefined();
        return contrast(theme[fg], theme[bg]) < 4.5;
      }).map(([fg, bg]) => `${fg} on ${bg}: ${contrast(theme[fg], theme[bg]).toFixed(2)}`);
      expect(failures).toEqual([]);
    });
  }
});
