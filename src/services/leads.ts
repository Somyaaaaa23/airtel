/**
 * Leads the self-serve journey didn't close: the owner asked for an expert, got stuck at KYC, or the first payment failed.
 * The back office works these as a call list. Prototype storage: this browser.
 */
import { readList, writeList } from "./store";

export type LeadStage = "advisor" | "quote" | "consent" | "kyc" | "contract" | "payment" | "track";
export interface AppLead {
  id: string;
  createdAt: string;
  phone: string;
  name?: string;
  business: string;
  city?: string;
  stage: LeadStage;
  /** Why it stopped, in plain words for the sales team. */
  reason: string;
  monthly?: number;
  score?: number;
  status: "open" | "converted" | "called";
}

const KEY = "udyam-digital.leads.v1";

export const loadLeads = () => readList<AppLead>(KEY);

/** One open lead per phone number: a later stop replaces an earlier one. */
export function saveLead(l: Omit<AppLead, "id" | "createdAt" | "status">) {
  const rest = loadLeads().filter((x) => !(x.phone === l.phone && x.status === "open"));
  writeList(KEY, [{ ...l, id: `LD-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString(), status: "open" as const }, ...rest]);
}

export function setLeadStatus(id: string, status: AppLead["status"]) {
  writeList(KEY, loadLeads().map((l) => (l.id === id ? { ...l, status } : l)));
}

/** The owner finished the journey: their open lead is closed as converted. */
export function convertLead(phone: string) {
  writeList(KEY, loadLeads().map((l) => (l.phone === phone && l.status === "open" ? { ...l, status: "converted" as const } : l)));
}
