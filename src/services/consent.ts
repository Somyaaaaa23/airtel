/**
 * DPDP Act 2023 consent: one purpose per checkbox, each logged with time and notice version, each withdrawable.
 * Production would write this log to an append-only store; the prototype keeps it in this browser.
 */
import { readList, writeList } from "./store";

export type Purpose = "kyc" | "install" | "updates" | "offers";
/** Required purposes are needed to deliver the service; the order can't go ahead without them. */
export const PURPOSES: { id: Purpose; required: boolean }[] = [
  { id: "kyc", required: true },
  { id: "install", required: true },
  { id: "updates", required: false },
  { id: "offers", required: false },
];
export const NOTICE_VERSION = "2026-11-v1";
export const GRIEVANCE = { name: "Grievance Officer, Accel Business", email: "privacy@accelbusiness.example", phone: "1800-000-0000" };

export interface ConsentEvent { phone: string; purpose: Purpose; granted: boolean; at: string; version: string }
const KEY = "udyam-digital.consent.v1";

export const consentLog = () => readList<ConsentEvent>(KEY);

export function recordConsent(phone: string, choices: Record<Purpose, boolean>) {
  const at = new Date().toISOString();
  const events = PURPOSES.map(({ id }) => ({ phone, purpose: id, granted: choices[id], at, version: NOTICE_VERSION }));
  writeList(KEY, [...events, ...consentLog()]);
}

export function withdrawConsent(phone: string, purpose: Purpose) {
  writeList(KEY, [{ phone, purpose, granted: false, at: new Date().toISOString(), version: NOTICE_VERSION }, ...consentLog()]);
}

/** Latest choice per purpose for a phone number. */
export function currentConsent(phone: string): Partial<Record<Purpose, boolean>> {
  const out: Partial<Record<Purpose, boolean>> = {};
  for (const e of consentLog()) if (e.phone === phone && out[e.purpose] === undefined) out[e.purpose] = e.granted;
  return out;
}
