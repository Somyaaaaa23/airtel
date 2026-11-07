import { describe, expect, it } from "vitest";
import { extract } from "./nlu";

describe("free-text understanding", () => {
  it("English sentence", () => {
    const e = extract("I run a kirana store in Patna, no GST, 3 staff. Want CCTV with 4 cameras and WhatsApp for orders");
    expect(e).toMatchObject({ businessTypeId: "kirana", city: "Patna", hasGstin: false, employees: 3, cameras: 4 });
    expect(e.needs.sort()).toEqual(["cctv", "whatsapp"]);
  });
  it("Hinglish", () => {
    const e = extract("mere 2 dukaan hai Jaipur me, gst nahi hai, billing aur wifi chahiye customers ke liye");
    expect(e).toMatchObject({ sites: 2, city: "Jaipur", hasGstin: false });
    expect(e.needs).toContain("pos_billing");
  });
  it("Hindi (Devanagari) with Devanagari digits", () => {
    const e = extract("मेरी दवा की दुकान है इंदौर में, ५ कर्मचारी, इंटरनेट और सीसीटीवी कैमरा चाहिए");
    expect(e).toMatchObject({ businessTypeId: "pharmacy", city: "Indore", employees: 5 });
    expect(e.needs.sort()).toEqual(["cctv", "internet"]);
  });
  it("speed, GSTIN and pincode", () => {
    const e = extract("Dental clinic, GSTIN 32TTNXB7384T1ZW, need 1 Gbps fibre, pincode 682001");
    expect(e).toMatchObject({ businessTypeId: "dental", gstin: "32TTNXB7384T1ZW", hasGstin: true, speedPref: "gigabit", pincode: "682001" });
  });
  it("backup internet is not data backup; guest wifi alone is not an internet request", () => {
    const b = extract("need backup internet when net goes down").needs;
    expect(b).toContain("backup_internet");
    expect(b).not.toContain("data_backup");
    expect(extract("free wifi for customers").needs).toEqual(["guest_wifi"]);
  });
  it("spend in rupees", () => {
    expect(extract("we spend about ₹2,500 a month").monthlySpend).toBe(2500);
    expect(extract("3000 rupees per month").monthlySpend).toBe(3000);
  });
});
