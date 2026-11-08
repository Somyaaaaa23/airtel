import { beforeEach, describe, expect, it } from "vitest";
import { clearKycDraft, draftKey, loadKycDraft, saveKycDraft } from "../services/kycDraft";
import type { Check } from "./kyc";
import { actionable, fixTarget, isBlurry } from "./kycFix";

describe("KYC fix-it targets", () => {
  it("sends document checks to that document's step", () => {
    expect(fixTarget({ code: "gstin_registry", status: "fail", doc: "gst" })).toEqual({ step: 0, doc: "gst" });
    expect(fixTarget({ code: "missing", status: "fail", doc: "address" })).toEqual({ step: 2, doc: "address" });
    expect(fixTarget({ code: "unreadable", status: "fail", doc: "id" })).toEqual({ step: 1, doc: "id" });
  });
  it("sends application checks to the document they compare against", () => {
    expect(fixTarget({ code: "applicant_match", status: "fail" })).toEqual({ step: 1, doc: "id" });
    expect(fixTarget({ code: "gstin_quote", status: "fail" })).toEqual({ step: 0, doc: "gst" });
    expect(fixTarget({ code: "address_recent", status: "fail" })).toEqual({ step: 2, doc: "address" });
  });
  it("lists failures before warnings and hides passes", () => {
    const cs: Check[] = [{ code: "id_valid", status: "pass" }, { code: "signatory", status: "warn" }, { code: "address_recent", status: "fail" }];
    expect(actionable(cs).map((c) => c.code)).toEqual(["address_recent", "signatory"]);
  });
  it("flags an unreadable photo as one to retake", () => {
    expect(isBlurry([{ code: "unreadable", status: "fail", doc: "gst" }], "gst")).toBe(true);
    expect(isBlurry([{ code: "unreadable", status: "fail", doc: "gst" }], "id")).toBe(false);
  });
});

describe("KYC resume later", () => {
  beforeEach(() => {
    const m = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
      getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k),
    } });
  });
  it("saves, restores and clears a draft per phone and quote, without photo blobs", () => {
    const key = draftKey("9876543210", "micro|1|3|P01x1");
    saveKycDraft(key, { step: 2, specimen: null, pan: "", slots: {
      gst: { name: "gst.jpg", image: "blob:http://x/1", status: "done" },
      id: { name: "K03_id.png", image: "/kyc/K03_id.png", status: "done" },
    } });
    const d = loadKycDraft(key)!;
    expect(d.step).toBe(2);
    expect(d.slots.gst?.image).toBeUndefined();
    expect(d.slots.id?.image).toBe("/kyc/K03_id.png");
    expect(loadKycDraft(draftKey("9876543210", "other"))).toBeNull();
    clearKycDraft(key);
    expect(loadKycDraft(key)).toBeNull();
  });
});
