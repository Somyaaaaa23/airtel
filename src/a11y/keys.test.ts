import { describe, expect, it } from "vitest";
import { arrowTarget, cycleFocus } from "./keys";

describe("keyboard navigation", () => {
  it("moves with arrows and wraps at both ends", () => {
    expect(arrowTarget("ArrowRight", 0, 3)).toBe(1);
    expect(arrowTarget("ArrowDown", 2, 3)).toBe(0);
    expect(arrowTarget("ArrowLeft", 0, 3)).toBe(2);
    expect(arrowTarget("ArrowUp", 1, 3)).toBe(0);
  });
  it("jumps with Home and End, ignores other keys and empty groups", () => {
    expect(arrowTarget("Home", 2, 5)).toBe(0);
    expect(arrowTarget("End", 0, 5)).toBe(4);
    expect(arrowTarget("Enter", 1, 5)).toBeNull();
    expect(arrowTarget("ArrowRight", 0, 0)).toBeNull();
  });
  it("keeps Tab inside a dialog", () => {
    expect(cycleFocus(3, 4, false)).toBe(0);
    expect(cycleFocus(0, 4, true)).toBe(3);
    expect(cycleFocus(-1, 4, false)).toBe(0);
    expect(cycleFocus(-1, 4, true)).toBe(3);
    expect(cycleFocus(0, 0, false)).toBe(-1);
  });
});
