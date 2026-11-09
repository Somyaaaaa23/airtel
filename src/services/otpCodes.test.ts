import { describe, expect, it } from "vitest";
// @ts-expect-error: plain JavaScript module used by the Node OTP server
import { createCodeStore } from "../../server/otp-codes.mjs";

type Store = { issue: (p: string) => { ok: boolean; code?: string; retryInMs?: number }; check: (p: string, c: string) => boolean; forget: (p: string) => void };

describe("OTP code store (textbee)", () => {
  const phone = "+919876543210";
  const clock = () => { let t = 1_000_000; return { now: () => t, add: (ms: number) => { t += ms; } }; };

  it("issues a 6-digit code that works once", () => {
    const s: Store = createCodeStore();
    const r = s.issue(phone);
    expect(r.code).toMatch(/^\d{6}$/);
    expect(s.check(phone, r.code!)).toBe(true);
    expect(s.check(phone, r.code!)).toBe(false);
  });
  it("rejects a wrong code and locks after too many attempts", () => {
    const s: Store = createCodeStore({ maxAttempts: 3 });
    const { code } = s.issue(phone);
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 3; i++) expect(s.check(phone, wrong)).toBe(false);
    expect(s.check(phone, code!)).toBe(false);
  });
  it("expires codes and limits how fast they can be re-sent", () => {
    const c = clock();
    const s: Store = createCodeStore({ ttlMs: 60_000, resendMs: 30_000, now: c.now });
    const first = s.issue(phone);
    expect(s.issue(phone)).toMatchObject({ ok: false });
    c.add(30_000);
    const second = s.issue(phone);
    expect(second.ok).toBe(true);
    c.add(61_000);
    expect(s.check(phone, second.code!)).toBe(false);
    expect(first.ok).toBe(true);
  });
  it("forget lets the owner retry straight away after a failed send", () => {
    const s: Store = createCodeStore();
    s.issue(phone);
    s.forget(phone);
    expect(s.issue(phone).ok).toBe(true);
  });
});
