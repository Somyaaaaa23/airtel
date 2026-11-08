/**
 * "Hold this price for 48 hours": remembers, per quote, when the held price expires.
 * A quote is identified by its items and quantities plus the segment and size that drive the offer.
 */
import type { Profile } from "../engine/types";

type Item = { productId: string; qty: number };

export const HOLD_HOURS = 48;
const KEY = "udyam-digital.price-holds.v1";
type Holds = Record<string, number>;

export function quoteSignature(items: Item[], profile: Pick<Profile, "segment" | "sites" | "employees">): string {
  const lines = [...items].sort((a, b) => a.productId.localeCompare(b.productId)).map((i) => `${i.productId}x${i.qty}`).join(",");
  return `${profile.segment}|${profile.sites}|${profile.employees}|${lines}`;
}

function read(): Holds {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Holds; } catch { return {}; }
}
function write(h: Holds) {
  try { localStorage.setItem(KEY, JSON.stringify(h)); } catch { /* not persisted */ }
}

/** Starts (or keeps) a hold and returns when it ends, in ms since epoch. */
export function holdPrice(sig: string, now = Date.now()): number {
  const h = read();
  const existing = h[sig];
  if (existing && existing > now) return existing;
  const until = now + HOLD_HOURS * 3600_000;
  const fresh = Object.fromEntries(Object.entries(h).filter(([, v]) => v > now));
  write({ ...fresh, [sig]: until });
  return until;
}

/** When the hold on this quote ends, or null if there is none or it has lapsed. */
export function heldUntil(sig: string, now = Date.now()): number | null {
  const v = read()[sig];
  return v && v > now ? v : null;
}

/** "47:59:08" style countdown; never negative. */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
