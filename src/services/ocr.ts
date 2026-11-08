/**
 * Mock OCR API. Production would send the photo to an OCR service and get text lines with positions back.
 * This prototype ships the lines that Apple Vision read from the hackathon's specimen documents
 * (scripts/ocr_specimens.swift → src/data/kyc_ocr.json), so the parsing and every check below run for real.
 */
import ocrJson from "../data/kyc_ocr.json";
import type { DocKind, OcrLine } from "../engine/kyc";

const OCR = ocrJson as unknown as Record<string, OcrLine[]>;
const FILE_KIND: Record<string, DocKind> = { gst_certificate: "gst", udyam_certificate: "udyam", signatory_id: "id", address_proof: "address" };

/** Specimen applicants K01–K12 and which of their documents exist. */
export const SPECIMENS: { id: string; docs: Partial<Record<DocKind, string>> }[] = [...new Set(Object.keys(OCR).map((k) => k.slice(0, 3)))]
  .sort()
  .map((id) => ({
    id,
    docs: Object.fromEntries(Object.entries(FILE_KIND).filter(([suffix]) => OCR[`${id}_${suffix}`]).map(([suffix, kind]) => [kind, `${id}_${suffix}`])),
  }));

export const specimenImage = (key: string) => `${import.meta.env.BASE_URL}kyc/${key}.png`;

/** Reads a document. Resolves to null when the photo isn't one OCR can read in this prototype. */
export async function readDocument(fileNameOrKey: string): Promise<OcrLine[] | null> {
  const key = fileNameOrKey.replace(/\.[a-z]+$/i, "");
  await new Promise((r) => setTimeout(r, 450));
  return OCR[key] ?? null;
}

export const readSpecimenSync = (key: string): OcrLine[] | undefined => OCR[key];
