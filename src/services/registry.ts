/**
 * Mock government lookup APIs, backed by the hackathon's synthetic registries.
 * In production these would call the GSTN and Udyam APIs; the interface (async, by identifier) stays the same.
 */
import gstRaw from "../data/mock_gstin_registry.csv?raw";
import udyamRaw from "../data/mock_udyam_registry.csv?raw";
import { parseCsv } from "../engine/csv";
import { validateGstinFormat } from "../engine/gstin";

export interface GstinRecord {
  gstin: string;
  legalName: string;
  tradeName: string;
  constitution: string;
  address: string;
  state: string;
  registrationDate: string;
  status: "Active" | "Cancelled" | "Suspended";
}

export interface UdyamRecord {
  udyamNumber: string;
  enterpriseName: string;
  enterpriseType: string;
  majorActivity: string;
  nicDescription: string;
  state: string;
  city: string;
  registrationDate: string;
}

let gstIndex: Map<string, GstinRecord> | null = null;
let udyamIndex: Map<string, UdyamRecord> | null = null;

function gst() {
  gstIndex ??= new Map(parseCsv(gstRaw).map((r) => [r.gstin, {
    gstin: r.gstin, legalName: r.legal_name, tradeName: r.trade_name, constitution: r.constitution,
    address: r.principal_place_of_business, state: r.state, registrationDate: r.registration_date,
    status: r.status as GstinRecord["status"],
  }]));
  return gstIndex;
}
function udyam() {
  udyamIndex ??= new Map(parseCsv(udyamRaw).map((r) => [r.udyam_number, {
    udyamNumber: r.udyam_number, enterpriseName: r.enterprise_name, enterpriseType: r.enterprise_type,
    majorActivity: r.major_activity, nicDescription: r.nic_description, state: r.state, city: r.city,
    registrationDate: r.date_of_registration,
  }]));
  return udyamIndex;
}

export type GstinLookup =
  | { result: "invalid_format"; error: string }
  | { result: "not_found" }
  | { result: "found"; record: GstinRecord };

export async function lookupGstin(input: string): Promise<GstinLookup> {
  const g = input.trim().toUpperCase();
  const fmt = validateGstinFormat(g);
  if (!fmt.ok) return { result: "invalid_format", error: fmt.error };
  const record = gst().get(g);
  return record ? { result: "found", record } : { result: "not_found" };
}

/** Udyam format: UDYAM-<2-letter state>-<2-digit district>-<7 digits>. District 00 is used throughout this dataset. */
export const UDYAM_RE = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

export async function lookupUdyam(input: string): Promise<{ result: "invalid_format" } | { result: "not_found" } | { result: "found"; record: UdyamRecord }> {
  const u = input.trim().toUpperCase();
  if (!UDYAM_RE.test(u)) return { result: "invalid_format" };
  const record = udyam().get(u);
  return record ? { result: "found", record } : { result: "not_found" };
}

export const allGstins = () => [...gst().values()];
