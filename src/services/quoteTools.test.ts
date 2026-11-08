import { beforeEach, describe, expect, it } from "vitest";
import { perDay } from "../engine/pricing";
import { formatCountdown, heldUntil, holdPrice, HOLD_HOURS, quoteSignature } from "./priceHold";
import { quoteShareText, whatsappUrl } from "./share";

function installStorage() {
  const m = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k),
  } });
}

const profile = { segment: "micro" as const, sites: 1, employees: 3 };
const items = [{ productId: "P23", qty: 4 }, { productId: "P01", qty: 1 }];

describe("quote tools", () => {
  beforeEach(installStorage);

  it("shows a monthly price per day over a 30-day month", () => {
    expect(perDay(3000)).toBe(100);
    expect(perDay(1597)).toBe(53);
  });

  it("identifies a quote regardless of item order", () => {
    expect(quoteSignature(items, profile)).toBe(quoteSignature([...items].reverse(), profile));
    expect(quoteSignature(items, profile)).not.toBe(quoteSignature([{ productId: "P23", qty: 2 }], profile));
  });

  it("holds a price for 48 hours and keeps the original end time if held again", () => {
    const sig = quoteSignature(items, profile);
    const now = 1_700_000_000_000;
    expect(heldUntil(sig, now)).toBeNull();
    const until = holdPrice(sig, now);
    expect(until - now).toBe(HOLD_HOURS * 3600_000);
    expect(holdPrice(sig, now + 60_000)).toBe(until);
    expect(heldUntil(sig, until - 1)).toBe(until);
    expect(heldUntil(sig, until + 1)).toBeNull();
  });

  it("formats the countdown as hours, minutes and seconds", () => {
    expect(formatCountdown(48 * 3600_000)).toBe("48:00:00");
    expect(formatCountdown(3725_000)).toBe("01:02:05");
    expect(formatCountdown(-5)).toBe("00:00:00");
  });

  it("builds a WhatsApp message with items and both prices, in either language", () => {
    const en = quoteShareText("en", items, 1597, 1897, "17 Jul, 10:00");
    expect(en).toContain("Cloud CCTV × 4");
    expect(en).toContain("₹1,597/month");
    expect(en).toContain("₹1,897");
    expect(en).toContain("17 Jul, 10:00");
    expect(quoteShareText("hi", items, 1597, 1897)).toContain("कीमत");
    expect(whatsappUrl("a b&c")).toBe("https://wa.me/?text=a%20b%26c");
  });
});
