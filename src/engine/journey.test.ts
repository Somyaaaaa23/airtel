import { describe, expect, it } from "vitest";
import { JOURNEY, journeyProgress, STEP_MINUTES } from "./journey";

describe("journey progress", () => {
  it("has seven steps from advisor to tracking", () => {
    expect(JOURNEY).toEqual(["advisor", "quote", "consent", "kyc", "sign", "pay", "track"]);
  });
  it("counts the current step and the rest", () => {
    const total = Object.values(STEP_MINUTES).reduce((a, b) => a + b, 0);
    expect(journeyProgress("advisor")).toEqual({ step: "advisor", number: 1, total: 7, minutesLeft: total });
    expect(journeyProgress("kyc").minutesLeft).toBe(STEP_MINUTES.kyc + STEP_MINUTES.sign + STEP_MINUTES.pay);
    expect(journeyProgress("track")).toMatchObject({ number: 7, minutesLeft: 0 });
  });
  it("never goes up as the owner moves forward", () => {
    const left = JOURNEY.map((s) => journeyProgress(s).minutesLeft);
    expect(left).toEqual([...left].sort((a, b) => b - a));
  });
});
