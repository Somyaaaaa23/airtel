import { describe, expect, it } from "vitest";
import { DOC_KINDS, fixGstinOcr, parseDocument, runKyc, type DocKind, type ParsedDoc } from "./kyc";
import { KYC_REGISTRY } from "../services/registry";
import { readSpecimenSync, SPECIMENS } from "../services/ocr";

function applicant(id: string, needsGst = true, application?: Parameters<typeof runKyc>[0]["application"]) {
  const s = SPECIMENS.find((x) => x.id === id)!;
  const docs: Partial<Record<DocKind, ParsedDoc>> = {};
  for (const k of DOC_KINDS) if (s.docs[k]) docs[k] = parseDocument(readSpecimenSync(s.docs[k]!)!);
  return runKyc({ docs, needsGst, application }, KYC_REGISTRY);
}
const fails = (id: string, needsGst = true) => applicant(id, needsGst).checks.filter((c) => c.status === "fail").map((c) => c.code);

describe("OCR parsing", () => {
  it("pairs labels with values and joins wrapped addresses", () => {
    const d = parseDocument(readSpecimenSync("K01_gst_certificate")!);
    expect(d.kind).toBe("gst");
    expect(d.fields.gstin).toBe("37IHKXV5167L1ZS");
    expect(d.fields.legalName).toBe("Neha Kaur (Prop. Vindhya Tours & Travels)");
    expect(d.fields.address).toBe("Shop/Unit 1, Tech Park Road, Visakhapatnam, Andhra Pradesh - 118383");
  });
  it("reads ID cards where the value sits under its label", () => {
    const d = parseDocument(readSpecimenSync("K09_signatory_id")!);
    expect(d.fields).toMatchObject({ name: "Anita Kulkarni", business: "Kaveri Insurance Advisors", idNumber: "SYN-ID-126040", validTill: "2027-12-22" });
  });
  it("fixes O read as 0 in a GSTIN only where the checksum confirms it", () => {
    expect(fixGstinOcr("19E0GXH4115Y1ZL")).toBe("19EOGXH4115Y1ZL");
    expect(fixGstinOcr("24X0RXG9365M1Z3")).toBe("24XORXG9365M1Z3");
  });
  it("marks a blurred photo unreadable", () => {
    expect(parseDocument(readSpecimenSync("K04_gst_certificate")!).readable).toBe(false);
  });
});

describe("KYC checks on the 12 specimen applicants", () => {
  it("passes clean applicants", () => {
    for (const id of ["K02", "K03", "K08", "K09", "K12"]) expect([id, applicant(id).status]).toEqual([id, "verified"]);
  });
  it("catches the problems planted in the pack", () => {
    expect(fails("K01")).toEqual(expect.arrayContaining(["gstin_registry", "field_missing"])); // cancelled GSTIN, Udyam number missing
    expect(fails("K04")).toContain("unreadable"); // blurred GST certificate
    expect(fails("K06")).toContain("gstin_format"); // one digit differs from the registry
    expect(fails("K07")).toContain("gst_name"); // legal name doesn't match the registry
    expect(fails("K11")).toContain("address_recent"); // bill older than 90 days
  });
  it("suggests the registry GSTIN an altered number was meant to be", () => {
    const c = applicant("K06").checks.find((x) => x.code === "gstin_format")!;
    expect(c.params).toMatchObject({ pos: 8, found: "8", expected: "5" });
  });
  it("sends non-partner signatories of an LLP or company to review", () => {
    expect(applicant("K10").status).toBe("review");
  });
  it("accepts a Udyam certificate instead of GST when the plan doesn't need GST", () => {
    expect(fails("K01", false)).toEqual(["field_missing", "business_proof"]);
  });
});

describe("KYC is checked against the application", () => {
  const k09 = { gstin: "37LDYXK0296F1ZB", state: "Andhra Pradesh", name: "Anita Kulkarni" };
  it("passes when the GSTIN, state and signatory match what the owner said", () => {
    expect(applicant("K09", true, k09).status).toBe("verified");
  });
  it("fails a certificate for a different GSTIN than the one given in the chat", () => {
    const codes = applicant("K09", true, { ...k09, gstin: "32TTNXB7384T1ZW" }).checks.filter((c) => c.status === "fail").map((c) => c.code);
    expect(codes).toContain("gstin_quote");
  });
  it("fails when the business is in a different state from the one named", () => {
    expect(applicant("K09", true, { ...k09, state: "Kerala" }).checks.find((c) => c.code === "state_match")!.status).toBe("fail");
  });
  it("fails when the ID belongs to someone other than the applicant", () => {
    expect(applicant("K09", true, { ...k09, name: "Rahul Verma" }).checks.find((c) => c.code === "applicant_match")!.status).toBe("fail");
  });
  it("accepts a business PAN for review when the plan needs no GST and nothing else verifies", () => {
    const r = runKyc({ docs: {
      id: parseDocument(readSpecimenSync("K09_signatory_id")!),
      address: parseDocument(readSpecimenSync("K09_address_proof")!),
    }, needsGst: false, application: { pan: "LDYXK0296F" } }, KYC_REGISTRY);
    expect(r.status).toBe("review");
    expect(r.checks.find((c) => c.code === "business_proof")!.status).toBe("pass");
  });
});
