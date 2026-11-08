/**
 * Demo mode for presenting the prototype: a per-device switch that reveals sample businesses, the staff login and a
 * reset. Reset clears every record this app keeps in the browser (orders, leads, consents, holds, drafts).
 */
const PREFIX = "udyam-digital.";
const MODE_KEY = `${PREFIX}demo-mode.v1`;

export function loadDemoMode(): boolean {
  try { return localStorage.getItem(MODE_KEY) === "1"; } catch { return false; }
}

export function saveDemoMode(on: boolean) {
  try { localStorage.setItem(MODE_KEY, on ? "1" : "0"); } catch { /* not persisted */ }
}

/** Removes all app records except the demo-mode switch itself. Returns how many keys were cleared. */
export function resetDemoData(): number {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX) && k !== MODE_KEY) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    return keys.length;
  } catch {
    return 0;
  }
}
