/** Where the owner goes to fix a failed KYC check: the stepper step and the document to replace or edit. */
import type { Check, DocKind } from "./kyc";

export const KYC_STEP_OF: Record<DocKind, number> = { gst: 0, udyam: 0, id: 1, address: 2 };

/** Checks about the application (not one document) are fixed on the document they compare against. */
const CODE_DOC: Partial<Record<Check["code"], DocKind>> = {
  business_proof: "gst", pan_format: "gst", gstin_quote: "gst", state_match: "gst",
  applicant_match: "id", names_match: "id", signatory: "id", id_valid: "id",
  address_recent: "address", address_match: "address",
};

export function fixTarget(c: Check): { step: number; doc: DocKind } {
  const doc = c.doc ?? CODE_DOC[c.code] ?? "gst";
  return { step: KYC_STEP_OF[doc], doc };
}

/** Failed checks first, then warnings; passes are not actionable. */
export const actionable = (checks: Check[]) =>
  checks.filter((c) => c.status !== "pass").sort((a, b) => (a.status === "fail" ? 0 : 1) - (b.status === "fail" ? 0 : 1));

/** A photo the owner should retake rather than edit: unreadable or low-confidence OCR. */
export const isBlurry = (checks: Check[], doc: DocKind) => checks.some((c) => c.doc === doc && c.code === "unreadable");
