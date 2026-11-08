/**
 * "Resume later" for Smart KYC: the documents read so far, the owner's edits and the current step,
 * kept per phone and quote. Photos the owner took are not stored (only their extracted fields).
 */
import type { DocKind, ParsedDoc } from "../engine/kyc";

export interface DraftSlot { name: string; image?: string; status: "done" | "error"; parsed?: ParsedDoc; edited?: string[] }
export interface KycDraft { step: number; specimen: string | null; pan: string; slots: Partial<Record<DocKind, DraftSlot>>; savedAt: string }

const KEY = "udyam-digital.kyc-drafts.v1";
type Store = Record<string, KycDraft>;
const read = (): Store => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Store; } catch { return {}; } };
const write = (s: Store) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* not persisted */ } };

export const draftKey = (phone: string, quoteSig: string) => `${phone}|${quoteSig}`;

export function saveKycDraft(key: string, d: Omit<KycDraft, "savedAt">, now = new Date()): KycDraft {
  const slots = Object.fromEntries(Object.entries(d.slots).filter(([, s]) => s && s.status !== undefined).map(([k, s]) => [k, {
    ...s!, image: s!.image && !s!.image.startsWith("blob:") ? s!.image : undefined,
  }])) as KycDraft["slots"];
  const saved: KycDraft = { ...d, slots, savedAt: now.toISOString() };
  write({ ...read(), [key]: saved });
  return saved;
}

export const loadKycDraft = (key: string): KycDraft | null => read()[key] ?? null;

export function clearKycDraft(key: string) {
  const s = read();
  delete s[key];
  write(s);
}
